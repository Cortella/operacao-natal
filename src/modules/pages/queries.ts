import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { parseTemplateConfig } from "@/modules/templates/config";
import type { GiftPageView } from "./schema";

const pageInclude = {
  template: { select: { config: true } },
  music: { select: { id: true, title: true, artist: true, url: true, active: true } },
  photos: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, caption: true },
  },
  messages: {
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { content: true, signature: true },
  },
} satisfies Prisma.GiftPageInclude;

type PageRow = NonNullable<Awaited<ReturnType<typeof findRow>>>;

function findRow(where: { id: string; ownerId?: string } | { slug: string }) {
  return db.giftPage.findFirst({ where, include: pageInclude });
}

function toView(row: PageRow): GiftPageView {
  const special = row.messages[0];
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    senderName: row.senderName,
    recipientName: row.recipientName,
    title: row.title,
    introText: row.introText,
    mainMessage: row.mainMessage,
    special: special?.content ? special : null,
    photos: row.photos,
    music: row.music?.active
      ? {
          id: row.music.id,
          title: row.music.title,
          artist: row.music.artist,
          url: row.music.url,
        }
      : null,
    templateId: row.templateId,
    template: parseTemplateConfig(row.template?.config),
  };
}

/** Página do usuário, ou null se não existe ou é de outra pessoa. */
export async function getOwnedPage(
  pageId: string,
  ownerId: string,
): Promise<(GiftPageView & { editorStep: number; expiresAt: Date | null }) | null> {
  const row = await findRow({ id: pageId, ownerId });
  return row ? { ...toView(row), editorStep: row.editorStep, expiresAt: row.expiresAt } : null;
}

/** Página pública pelo slug: só publicada e dentro da validade. */
export async function getPublishedPage(
  slug: string,
): Promise<{ state: "ok"; page: GiftPageView } | { state: "missing" | "unavailable" }> {
  const row = await findRow({ slug });
  if (!row) return { state: "missing" };
  const expired = row.expiresAt !== null && row.expiresAt.getTime() <= Date.now();
  if (row.status !== "PUBLISHED" || expired) return { state: "unavailable" };
  return { state: "ok", page: toView(row) };
}

export type PageSummary = {
  id: string;
  slug: string | null;
  status: GiftPageView["status"];
  title: string;
  recipientName: string;
  cover: string | null;
  expired: boolean;
  updatedAt: Date;
};

export async function listUserPages(ownerId: string): Promise<PageSummary[]> {
  const rows = await db.giftPage.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
      recipientName: true,
      expiresAt: true,
      updatedAt: true,
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  return rows.map(({ photos, expiresAt, ...row }) => ({
    ...row,
    cover: photos[0]?.url ?? null,
    expired: expiresAt !== null && expiresAt.getTime() <= Date.now(),
  }));
}

/**
 * Rascunho mais recente do usuário; cria um novo se não houver.
 * A trava por usuário impede que duas requisições simultâneas (o navegador costuma
 * pedir /criar mais de uma vez) criem dois rascunhos.
 */
export async function getOrCreateDraftId(ownerId: string, senderName: string): Promise<string> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"rascunho:" + ownerId}::text))::text`;
    const draft = await tx.giftPage.findFirst({
      where: { ownerId, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    return draft?.id ?? createDraft(tx, ownerId, senderName);
  });
}

/** Cria uma página nova, mesmo que já exista rascunho ("Criar outra página"). */
export async function createDraftId(ownerId: string, senderName: string): Promise<string> {
  return createDraft(db, ownerId, senderName);
}

async function createDraft(
  client: Pick<typeof db, "template" | "giftPage">,
  ownerId: string,
  senderName: string,
): Promise<string> {
  const template = await client.template.findFirst({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const page = await client.giftPage.create({
    data: { ownerId, senderName: senderName.split(" ")[0] ?? "", templateId: template?.id },
    select: { id: true },
  });
  return page.id;
}

export type EditorOptions = {
  templates: Array<{
    id: string;
    name: string;
    description: string;
    config: GiftPageView["template"];
  }>;
  musics: Array<{ id: string; title: string; artist: string | null; url: string; mine: boolean }>;
};

/** Modelos ativos e músicas disponíveis para o usuário (biblioteca + as que ele enviou). */
export async function getEditorOptions(userId: string): Promise<EditorOptions> {
  const [templates, musics] = await Promise.all([
    db.template.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, config: true },
    }),
    db.music.findMany({
      where: { active: true, OR: [{ source: "PLATFORM" }, { source: "USER", ownerId: userId }] },
      orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, artist: true, url: true, source: true },
    }),
  ]);
  return {
    templates: templates.map((template) => ({
      ...template,
      config: parseTemplateConfig(template.config),
    })),
    musics: musics.map(({ source, ...music }) => ({ ...music, mine: source === "USER" })),
  };
}
