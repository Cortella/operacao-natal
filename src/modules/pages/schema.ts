import { z } from "zod";
import type { TemplateConfig } from "@/modules/templates/config";

/** Limites de texto, usados no formulário e na validação do servidor. */
export const LIMITS = {
  name: 60,
  title: 80,
  introText: 300,
  mainMessage: 1000,
  specialMessage: 600,
  signature: 60,
  caption: 60,
  musicTitle: 80,
} as const;

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const MUSIC_MAX_BYTES = 12 * 1024 * 1024;
export const EDITOR_STEPS = 7;

// Texto livre: remove caracteres de controle e espaços nas pontas.
const text = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((value) =>
      value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim(),
    )
    .pipe(z.string().max(max, `Use no máximo ${max} caracteres.`));

/** No rascunho os campos podem ficar vazios; a obrigatoriedade é conferida antes do pagamento. */
export const detailsSchema = z.object({
  senderName: text(LIMITS.name),
  recipientName: text(LIMITS.name),
  title: text(LIMITS.title),
  introText: text(LIMITS.introText),
  mainMessage: text(LIMITS.mainMessage),
});
export type PageDetails = z.infer<typeof detailsSchema>;

export const specialMessageSchema = z.object({
  content: text(LIMITS.specialMessage),
  signature: text(LIMITS.signature),
});

export const captionSchema = text(LIMITS.caption);
export const idSchema = z.string().min(1).max(64);
export const stepSchema = z.number().int().min(1).max(EDITOR_STEPS);

export const musicUploadSchema = z.object({
  title: text(LIMITS.musicTitle).pipe(z.string().min(1, "Dê um nome para a música.")),
  mime: z.string().max(100),
  size: z.number().int().min(1).max(MUSIC_MAX_BYTES, "A música precisa ter no máximo 12 MB."),
  rightsDeclared: z.literal(true, {
    error: "Confirme que você tem o direito de usar esta música.",
  }),
});

/** Dados de uma página prontos para renderizar (editor, prévia e página pública). */
export type GiftPageView = {
  id: string;
  slug: string | null;
  status: "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "DISABLED";
  senderName: string;
  recipientName: string;
  title: string;
  introText: string;
  mainMessage: string;
  special: { content: string; signature: string } | null;
  photos: Array<{ id: string; url: string; caption: string }>;
  music: { id: string; title: string; artist: string | null; url: string } | null;
  templateId: string | null;
  template: TemplateConfig;
};

export type MissingItem = { step: number; label: string };

/** O que ainda falta preencher para a página poder ir ao pagamento. */
export function missingForCheckout(page: GiftPageView): MissingItem[] {
  const missing: MissingItem[] = [];
  if (!page.senderName) missing.push({ step: 1, label: "Seu nome" });
  if (!page.recipientName) missing.push({ step: 1, label: "Nome de quem vai receber" });
  if (!page.title) missing.push({ step: 1, label: "Título da página" });
  if (!page.mainMessage) missing.push({ step: 1, label: "Mensagem principal" });
  if (page.photos.length === 0) missing.push({ step: 2, label: "Pelo menos uma foto" });
  if (!page.templateId) missing.push({ step: 5, label: "Modelo da página" });
  return missing;
}

/** "João & Maria" -> "joao-e-maria". Base do endereço público. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Slug sugerido a partir dos nomes: "joao-e-maria". */
export function baseSlug(senderName: string, recipientName: string): string {
  const first = (name: string) => slugify(name.trim().split(/\s+/)[0] ?? "");
  const sender = first(senderName);
  const recipient = first(recipientName);
  if (sender && recipient) return `${sender}-e-${recipient}`;
  return sender || recipient || "presente";
}
