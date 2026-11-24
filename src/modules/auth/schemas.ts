import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Digite um e-mail válido.").max(254, "E-mail muito longo."));

const newPassword = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(200, "A senha é longa demais.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Digite seu nome.").max(80, "Use no máximo 80 caracteres."),
  email,
  password: newPassword,
  acceptTerms: z.literal("on", {
    error: "Você precisa aceitar os termos e a política de privacidade.",
  }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Digite sua senha.").max(200),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: newPassword,
});

export type FieldErrors = Record<string, string>;

/** Converte os erros do Zod em uma mensagem por campo, pronta para o formulário. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
