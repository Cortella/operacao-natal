"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIO_TYPES, audioFormatFromMime, detectAudio } from "@/lib/files";
import {
  createUpload,
  deleteObject,
  deleteObjects,
  headObject,
  isStorageConfigured,
  newStorageKey,
  publicUrl,
  readObjectStart,
} from "@/integrations/storage";
import type { MusicUpload } from "@/modules/pages/actions";
import {
  LIMITS,
  MUSIC_MAX_BYTES,
  detailsSchema,
  slugify,
  specialMessageSchema,
} from "@/modules/pages/schema";
import { DEFAULT_SETTINGS, landingSchema } from "@/modules/settings/schema";
import { saveSetting } from "@/modules/settings/service";
import { templateConfigSchema } from "@/modules/templates/config";

// Toda ação deste arquivo começa com requireAdmin(): as telas do painel já exigem
// o papel, mas cada ação é um endpoint público por si só e confere de novo.

/** Volta para a tela de origem com uma mensagem de sucesso ou de erro. */
function back(path: string, kind: "ok" | "erro", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${kind}=${encodeURIComponent(message)}`);
}

const str = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Confira os campos.";

/** "19,90" ou "19.90" -> 1990 centavos. */
function parseMoney(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Campo datetime-local (horário de Brasília) -> ISO com fuso. */
function parseLocalDate(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return `${value}:00-03:00`;
}

/* ------------------------------- Páginas ------------------------------- */

export async function adminSetPageBlocked(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  const block = str(form, "block") === "1";
  const path = str(form, "from") || "/admin/paginas";

  if (block) {
    await db.giftPage.updateMany({
      where: { id },
      data: { status: "DISABLED", blockedByAdmin: true },
    });
    back(path, "ok", "Página desativada.");
  }
  const page = await db.giftPage.findUnique({
    where: { id },
    select: { slug: true, _count: { select: { orders: { where: { status: "PAID" } } } } },
  });
  if (!page) back(path, "erro", "Página não encontrada.");
  // Só volta ao ar o que já foi pago; o restante retorna para rascunho.
  const paid = page._count.orders > 0 && page.slug !== null;
  await db.giftPage.update({
    where: { id },
    data: { blockedByAdmin: false, status: paid ? "PUBLISHED" : "DRAFT" },
  });
  back(
    path,
    "ok",
    paid ? "Página reativada." : "Bloqueio removido; a página voltou a ser rascunho.",
  );
}

export async function adminUpdatePage(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  const path = `/admin/paginas/${id}`;

  const details = detailsSchema.safeParse({
    senderName: str(form, "senderName"),
    recipientName: str(form, "recipientName"),
    title: str(form, "title"),
    introText: str(form, "introText"),
    mainMessage: str(form, "mainMessage"),
  });
  const special = specialMessageSchema.safeParse({
    content: str(form, "specialContent"),
    signature: str(form, "specialSignature"),
  });
  if (!details.success) back(path, "erro", firstIssue(details.error));
  if (!special.success) back(path, "erro", firstIssue(special.error));

  const expiresRaw = str(form, "expiresAt");
  const expiresIso = parseLocalDate(expiresRaw);
  if (expiresRaw && !expiresIso) back(path, "erro", "Data de expiração inválida.");

  const exists = await db.giftPage.findUnique({ where: { id }, select: { id: true } });
  if (!exists) back("/admin/paginas", "erro", "Página não encontrada.");

  await db.$transaction(async (tx) => {
    await tx.giftPage.update({
      where: { id },
      data: { ...details.data, expiresAt: expiresIso ? new Date(expiresIso) : null },
    });
    await tx.message.deleteMany({ where: { pageId: id } });
    if (special.data.content || special.data.signature) {
      await tx.message.create({ data: { pageId: id, ...special.data } });
    }
  });
  back(path, "ok", "Página atualizada.");
}

/**
 * Exclui a página e as fotos do storage. Pedidos e pagamentos são mantidos, sem
 * vínculo com a página, porque são registros financeiros (ver política de retenção).
 */
export async function adminDeletePage(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  if (str(form, "confirm") !== "EXCLUIR") {
    back(`/admin/paginas/${id}`, "erro", 'Digite "EXCLUIR" para confirmar.');
  }
  const photos = await db.photo.findMany({ where: { pageId: id }, select: { storageKey: true } });
  await db.giftPage.deleteMany({ where: { id } });
  await deleteObjects(photos.map((photo) => photo.storageKey)).catch((error) =>
    console.error("[admin] Falha ao apagar fotos do storage.", error),
  );
  back("/admin/paginas", "ok", "Página excluída.");
}

/* ------------------------------ Comercial ------------------------------ */

export async function adminSavePricing(form: FormData): Promise<void> {
  await requireAdmin();
  const path = "/admin/comercial";
  const priceCents = parseMoney(str(form, "price"));
  if (priceCents === null || priceCents < 100) back(path, "erro", "Informe um preço válido.");

  const promoRaw = str(form, "promoPrice").trim();
  const promoPriceCents = promoRaw ? parseMoney(promoRaw) : null;
  if (promoRaw && (promoPriceCents === null || promoPriceCents < 100)) {
    back(path, "erro", "Informe um preço promocional válido.");
  }
  if (promoPriceCents !== null && promoPriceCents >= priceCents) {
    back(path, "erro", "O preço promocional precisa ser menor que o preço normal.");
  }
  const endsRaw = str(form, "promoEndsAt");
  const promoEndsAt = parseLocalDate(endsRaw);
  if (endsRaw && !promoEndsAt) back(path, "erro", "Data de término inválida.");

  await saveSetting("pricing", {
    priceCents,
    promoPriceCents,
    promoLabel: str(form, "promoLabel").trim().slice(0, 120) || DEFAULT_SETTINGS.pricing.promoLabel,
    promoEndsAt,
  });
  back(path, "ok", "Preço atualizado.");
}

export async function adminSavePageRules(form: FormData): Promise<void> {
  await requireAdmin();
  const path = "/admin/comercial";
  const daysRaw = str(form, "expirationDays").trim();
  const days = daysRaw ? Number(daysRaw) : null;
  const maxPhotos = Number(str(form, "maxPhotos"));
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) {
    back(path, "erro", "Informe a validade em dias (1 a 3650) ou deixe vazio.");
  }
  if (!Number.isInteger(maxPhotos) || maxPhotos < 1 || maxPhotos > 30) {
    back(path, "erro", "O limite de fotos deve ficar entre 1 e 30.");
  }
  await saveSetting("pages", { expirationDays: days, maxPhotos });
  back(path, "ok", "Regras das páginas atualizadas.");
}

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, "Use de 3 a 40 letras, números, hífen ou sublinhado no código."),
  type: z.enum(["PERCENT", "FIXED"]),
  maxRedemptions: z.number().int().min(1).max(1_000_000).nullable(),
});

export async function adminCreateCoupon(form: FormData): Promise<void> {
  await requireAdmin();
  const path = "/admin/cupons";
  const maxRaw = str(form, "maxRedemptions").trim();
  const parsed = couponSchema.safeParse({
    code: str(form, "code"),
    type: str(form, "type"),
    maxRedemptions: maxRaw ? Number(maxRaw) : null,
  });
  if (!parsed.success) back(path, "erro", firstIssue(parsed.error));

  const valueRaw = str(form, "value");
  const value = parsed.data.type === "PERCENT" ? Number(valueRaw) : parseMoney(valueRaw);
  if (value === null || !Number.isInteger(value) || value < 1) {
    back(path, "erro", "Informe o valor do desconto.");
  }
  if (parsed.data.type === "PERCENT" && value > 100) {
    back(path, "erro", "O percentual vai de 1 a 100.");
  }
  const startsRaw = str(form, "startsAt");
  const endsRaw = str(form, "endsAt");
  const startsAt = parseLocalDate(startsRaw);
  const endsAt = parseLocalDate(endsRaw);
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) back(path, "erro", "Data inválida.");

  try {
    await db.coupon.create({
      data: {
        ...parsed.data,
        value,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      back(path, "erro", "Já existe um cupom com este código.");
    }
    throw error;
  }
  back(path, "ok", `Cupom ${parsed.data.code} criado.`);
}

export async function adminToggleCoupon(form: FormData): Promise<void> {
  await requireAdmin();
  const active = str(form, "active") === "1";
  await db.coupon.updateMany({ where: { id: str(form, "id") }, data: { active } });
  back("/admin/cupons", "ok", active ? "Cupom ativado." : "Cupom desativado.");
}

export async function adminDeleteCoupon(form: FormData): Promise<void> {
  await requireAdmin();
  // Pedidos que usaram o cupom continuam com o desconto gravado.
  await db.coupon.deleteMany({ where: { id: str(form, "id") } });
  back("/admin/cupons", "ok", "Cupom excluído.");
}

/* ------------------------------- Conteúdo ------------------------------ */

export async function adminSaveLanding(form: FormData): Promise<void> {
  await requireAdmin();
  const path = "/admin/conteudo";
  const questions = form.getAll("faqQuestion").map(String);
  const answers = form.getAll("faqAnswer").map(String);
  const faq = questions
    .map((question, index) => ({
      question: question.trim(),
      answer: (answers[index] ?? "").trim(),
    }))
    .filter((item) => item.question && item.answer);

  const parsed = landingSchema.safeParse({
    heroTitle: str(form, "heroTitle").trim(),
    heroSubtitle: str(form, "heroSubtitle").trim(),
    ctaLabel: str(form, "ctaLabel").trim(),
    finalTitle: str(form, "finalTitle").trim(),
    finalSubtitle: str(form, "finalSubtitle").trim(),
    faq,
  });
  if (!parsed.success) back(path, "erro", "Preencha todos os textos dentro dos limites.");
  await saveSetting("landing", parsed.data);
  back(path, "ok", "Textos da landing atualizados.");
}

export async function adminRestoreLanding(): Promise<void> {
  await requireAdmin();
  await saveSetting("landing", DEFAULT_SETTINGS.landing);
  back("/admin/conteudo", "ok", "Textos padrão restaurados.");
}

const musicSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(LIMITS.musicTitle),
  artist: z.string().trim().max(80),
  license: z.string().trim().min(5, "Descreva a licença ou autorização de uso da música.").max(300),
  mime: z.string().max(100),
  size: z.number().int().min(1).max(MUSIC_MAX_BYTES, "A música precisa ter no máximo 12 MB."),
});

type UploadResult = { ok: true; data: MusicUpload } | { ok: false; error: string };

/** Passo 1 do cadastro de música da biblioteca: autoriza o envio direto ao storage. */
export async function adminRequestMusicUpload(input: unknown): Promise<UploadResult> {
  await requireAdmin();
  if (!isStorageConfigured()) return { ok: false, error: "Storage não configurado." };
  const parsed = musicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const format = audioFormatFromMime(parsed.data.mime);
  if (!format) return { ok: false, error: "Envie a música em MP3, M4A, OGG ou WAV." };

  const { mime, extension } = AUDIO_TYPES[format];
  const key = newStorageKey("musicas", extension);
  const last = await db.music.aggregate({
    where: { source: "PLATFORM" },
    _max: { sortOrder: true },
  });
  const music = await db.music.create({
    data: {
      title: parsed.data.title,
      artist: parsed.data.artist || null,
      license: parsed.data.license,
      url: publicUrl(key),
      storageKey: key,
      source: "PLATFORM",
      active: false,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
  const upload = await createUpload({ key, contentType: mime, maxBytes: MUSIC_MAX_BYTES });
  return { ok: true, data: { musicId: music.id, url: upload.url, fields: upload.fields } };
}

/** Passo 2: confere o arquivo enviado e libera a música na biblioteca. */
export async function adminConfirmMusicUpload(
  musicId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const music = await db.music.findFirst({
    where: { id: String(musicId), source: "PLATFORM", active: false },
    select: { id: true, storageKey: true },
  });
  if (!music?.storageKey) return { ok: false, error: "Envio não encontrado." };
  const key = music.storageKey;

  const head = await headObject(key);
  const valid =
    head !== null && head.size <= MUSIC_MAX_BYTES && detectAudio(await readObjectStart(key, 16));
  if (!valid) {
    await db.music.delete({ where: { id: music.id } });
    await deleteObject(key).catch(() => undefined);
    return { ok: false, error: "O arquivo enviado não é uma música válida." };
  }
  await db.music.update({ where: { id: music.id }, data: { active: true } });
  return { ok: true };
}

export async function adminToggleMusic(form: FormData): Promise<void> {
  await requireAdmin();
  const active = str(form, "active") === "1";
  await db.music.updateMany({
    where: { id: str(form, "id"), source: "PLATFORM" },
    data: { active },
  });
  back("/admin/musicas", "ok", active ? "Música ativada." : "Música desativada.");
}

export async function adminDeleteMusic(form: FormData): Promise<void> {
  await requireAdmin();
  const music = await db.music.findFirst({
    where: { id: str(form, "id"), source: "PLATFORM" },
    select: { id: true, storageKey: true, _count: { select: { pages: true } } },
  });
  if (!music) back("/admin/musicas", "erro", "Música não encontrada.");
  if (music._count.pages > 0) {
    back(
      "/admin/musicas",
      "erro",
      "Esta música está em uso em páginas. Desative-a em vez de excluir.",
    );
  }
  await db.music.delete({ where: { id: music.id } });
  if (music.storageKey) await deleteObject(music.storageKey).catch(() => undefined);
  back("/admin/musicas", "ok", "Música excluída.");
}

const templateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do modelo.").max(60),
  description: z.string().trim().min(2, "Descreva o modelo.").max(160),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
  config: templateConfigSchema,
});

export async function adminSaveTemplate(form: FormData): Promise<void> {
  await requireAdmin();
  const id = str(form, "id");
  const path = "/admin/modelos";
  const parsed = templateSchema.safeParse({
    name: str(form, "name"),
    description: str(form, "description"),
    sortOrder: Number(str(form, "sortOrder") || 0),
    active: form.get("active") === "on",
    config: {
      background: str(form, "background"),
      cardTone: str(form, "cardTone"),
      accent: str(form, "accent"),
      galleryLayout: str(form, "galleryLayout"),
      messageStyle: str(form, "messageStyle"),
      elfPose: str(form, "elfPose"),
      opening: str(form, "opening"),
      snow: form.get("snow") === "on",
      lights: form.get("lights") === "on",
    },
  });
  if (!parsed.success) back(path, "erro", firstIssue(parsed.error));

  if (id) {
    await db.template.updateMany({ where: { id }, data: parsed.data });
    back(path, "ok", `Modelo "${parsed.data.name}" atualizado.`);
  }

  const base = slugify(parsed.data.name) || "modelo";
  let slug = base;
  for (let attempt = 2; await db.template.findUnique({ where: { slug } }); attempt++) {
    slug = `${base}-${attempt}`;
  }
  await db.template.create({ data: { ...parsed.data, slug } });
  back(path, "ok", `Modelo "${parsed.data.name}" criado.`);
}

export async function adminDeleteTemplate(form: FormData): Promise<void> {
  await requireAdmin();
  const path = "/admin/modelos";
  const template = await db.template.findUnique({
    where: { id: str(form, "id") },
    select: { id: true, _count: { select: { pages: true } } },
  });
  if (!template) back(path, "erro", "Modelo não encontrado.");
  if (template._count.pages > 0) {
    back(path, "erro", "Este modelo está em uso. Desative-o em vez de excluir.");
  }
  if ((await db.template.count({ where: { active: true, id: { not: template.id } } })) === 0) {
    back(path, "erro", "Mantenha pelo menos um modelo ativo.");
  }
  await db.template.delete({ where: { id: template.id } });
  back(path, "ok", "Modelo excluído.");
}
