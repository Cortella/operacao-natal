"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireUser, type SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIO_TYPES, audioFormatFromMime, detectAudio } from "@/lib/files";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import {
  createUpload,
  deleteObject,
  headObject,
  isStorageConfigured,
  newStorageKey,
  publicUrl,
  readObjectStart,
} from "@/integrations/storage";
import { createDraftId } from "./queries";
import {
  MUSIC_MAX_BYTES,
  captionSchema,
  detailsSchema,
  idSchema,
  musicUploadSchema,
  specialMessageSchema,
  stepSchema,
} from "./schema";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

const SESSION_EXPIRED = "Sua sessão expirou. Entre de novo para continuar.";
const NOT_FOUND = "Não encontramos esta página na sua conta.";
const INVALID = "Não foi possível salvar. Confira os campos e tente de novo.";

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? INVALID;

/**
 * Toda ação começa aqui: confere a sessão e se a página pertence a quem pediu.
 * O id da página vem do navegador e nunca é aceito sem essa checagem.
 */
async function ownedPage(
  pageId: unknown,
): Promise<{ error: string } | { user: SessionUser; pageId: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: SESSION_EXPIRED };
  const id = idSchema.safeParse(pageId);
  if (!id.success) return { error: NOT_FOUND };
  const page = await db.giftPage.findFirst({
    where: { id: id.data, ownerId: user.id },
    select: { id: true },
  });
  if (!page) return { error: NOT_FOUND };
  return { user, pageId: page.id };
}

export async function saveDetails(pageId: string, input: unknown): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  await db.giftPage.update({ where: { id: access.pageId }, data: parsed.data });
  return { ok: true };
}

export async function saveSpecialMessage(pageId: string, input: unknown): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = specialMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const existing = await db.message.findFirst({
    where: { pageId: access.pageId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!parsed.data.content && !parsed.data.signature) {
    await db.message.deleteMany({ where: { pageId: access.pageId } });
  } else if (existing) {
    await db.message.update({ where: { id: existing.id }, data: parsed.data });
  } else {
    await db.message.create({ data: { pageId: access.pageId, ...parsed.data } });
  }
  await db.giftPage.update({ where: { id: access.pageId }, data: { updatedAt: new Date() } });
  return { ok: true };
}

export async function saveTemplate(pageId: string, templateId: string): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const id = idSchema.safeParse(templateId);
  const template = id.success
    ? await db.template.findFirst({ where: { id: id.data, active: true }, select: { id: true } })
    : null;
  if (!template) return { ok: false, error: "Este modelo não está mais disponível." };

  await db.giftPage.update({ where: { id: access.pageId }, data: { templateId: template.id } });
  return { ok: true };
}

export async function saveMusic(pageId: string, musicId: string | null): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };

  if (musicId !== null) {
    const id = idSchema.safeParse(musicId);
    const music = id.success
      ? await db.music.findFirst({
          where: {
            id: id.data,
            active: true,
            OR: [{ source: "PLATFORM" }, { source: "USER", ownerId: access.user.id }],
          },
          select: { id: true },
        })
      : null;
    if (!music) return { ok: false, error: "Esta música não está mais disponível." };
  }

  await db.giftPage.update({ where: { id: access.pageId }, data: { musicId } });
  return { ok: true };
}

export async function saveStep(pageId: string, step: number): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = stepSchema.safeParse(step);
  if (!parsed.success) return { ok: false, error: INVALID };

  await db.giftPage.update({ where: { id: access.pageId }, data: { editorStep: parsed.data } });
  return { ok: true };
}

export async function savePhotoOrder(pageId: string, photoIds: string[]): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const ids = z.array(idSchema).max(100).safeParse(photoIds);
  if (!ids.success) return { ok: false, error: INVALID };

  const current = await db.photo.findMany({
    where: { pageId: access.pageId },
    select: { id: true },
  });
  const known = new Set(current.map((photo) => photo.id));
  const sameSet =
    ids.data.length === known.size &&
    new Set(ids.data).size === known.size &&
    ids.data.every((id) => known.has(id));
  if (!sameSet) {
    return { ok: false, error: "As fotos mudaram. Recarregue a página e tente de novo." };
  }

  await db.$transaction(
    ids.data.map((id, index) => db.photo.update({ where: { id }, data: { sortOrder: index } })),
  );
  return { ok: true };
}

export async function savePhotoCaption(
  pageId: string,
  photoId: string,
  caption: string,
): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  const parsed = captionSchema.safeParse(caption);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const updated = await db.photo.updateMany({
    where: { id: String(photoId), pageId: access.pageId },
    data: { caption: parsed.data },
  });
  return updated.count === 1 ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function deletePhoto(pageId: string, photoId: string): Promise<ActionResult> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };

  const photo = await db.photo.findFirst({
    where: { id: String(photoId), pageId: access.pageId },
    select: { id: true, storageKey: true },
  });
  if (!photo) return { ok: true };

  await db.photo.delete({ where: { id: photo.id } });
  // O registro já saiu; uma falha aqui só deixa um arquivo órfão, sem efeito para o usuário.
  await deleteObject(photo.storageKey).catch((error) =>
    console.error("[storage] Falha ao apagar foto.", error),
  );
  return { ok: true };
}

export type MusicUpload = {
  musicId: string;
  url: string;
  fields: Record<string, string>;
};

/**
 * Passo 1 do envio de música própria: valida o pedido e devolve a autorização
 * para o navegador enviar o arquivo direto ao storage.
 */
export async function requestMusicUpload(
  pageId: string,
  input: unknown,
): Promise<ActionResult<MusicUpload>> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };
  if (!isStorageConfigured()) {
    return { ok: false, error: "O envio de arquivos está indisponível no momento." };
  }
  const parsed = musicUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const format = audioFormatFromMime(parsed.data.mime);
  if (!format) return { ok: false, error: "Envie a música em MP3, M4A, OGG ou WAV." };

  const limit = await rateLimit(`musica:${access.user.id}`, 10, 60 * 60);
  if (!limit.allowed) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };

  const { mime, extension } = AUDIO_TYPES[format];
  const key = newStorageKey("musicas", extension);
  const music = await db.music.create({
    data: {
      title: parsed.data.title,
      url: publicUrl(key),
      storageKey: key,
      source: "USER",
      ownerId: access.user.id,
      // Fica inativa até o arquivo ser conferido em confirmMusicUpload.
      active: false,
      rightsDeclaredAt: new Date(),
      license: "Enviada pelo comprador, que declarou ter direito de uso.",
    },
    select: { id: true },
  });
  const upload = await createUpload({ key, contentType: mime, maxBytes: MUSIC_MAX_BYTES });
  return { ok: true, data: { musicId: music.id, url: upload.url, fields: upload.fields } };
}

/** Passo 2: confere o arquivo que chegou ao storage e liga a música à página. */
export async function confirmMusicUpload(
  pageId: string,
  musicId: string,
): Promise<ActionResult<{ id: string; title: string; url: string }>> {
  const access = await ownedPage(pageId);
  if ("error" in access) return { ok: false, error: access.error };

  const music = await db.music.findFirst({
    where: { id: String(musicId), ownerId: access.user.id, source: "USER", active: false },
    select: { id: true, title: true, url: true, storageKey: true },
  });
  if (!music?.storageKey) return { ok: false, error: "Não encontramos este envio. Tente de novo." };
  const key = music.storageKey;

  const reject = async (error: string): Promise<ActionResult<never>> => {
    await db.music.delete({ where: { id: music.id } });
    await deleteObject(key).catch(() => undefined);
    return { ok: false, error };
  };

  const head = await headObject(key);
  if (!head) return reject("O envio não foi concluído. Tente de novo.");
  if (head.size > MUSIC_MAX_BYTES) return reject("A música precisa ter no máximo 12 MB.");
  if (!detectAudio(await readObjectStart(key, 16))) {
    return reject("Este arquivo não parece ser uma música válida.");
  }

  await db.$transaction([
    db.music.update({ where: { id: music.id }, data: { active: true } }),
    db.giftPage.update({ where: { id: access.pageId }, data: { musicId: music.id } }),
  ]);
  return { ok: true, data: { id: music.id, title: music.title, url: music.url } };
}

/** Começa uma nova página (botão "Criar outra página"). */
export async function createPageAction(): Promise<void> {
  const user = await requireUser("/criar");
  const limit = await rateLimit(`pagina:${user.id}`, 20, 60 * 60);
  if (!limit.allowed) redirect("/minhas-paginas");
  const id = await createDraftId(user.id, user.name);
  redirect(`/criar/${id}`);
}
