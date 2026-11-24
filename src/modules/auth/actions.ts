"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { emailLayout, sendEmail } from "@/integrations/email";
import { safeReturnPath } from "./constants";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type FieldErrors,
} from "./schemas";
import { createSession, deleteAllSessions, deleteSession } from "./sessions";
import { generateToken, hashToken } from "./tokens";

export type AuthFormState = {
  /** Erros por campo; `form` é o erro geral. */
  errors?: FieldErrors;
  /** Mensagem de sucesso, quando a ação não redireciona. */
  success?: string;
  /** Valores devolvidos para o formulário não ser apagado em caso de erro. */
  values?: Record<string, string>;
};

const RESET_TOKEN_MINUTES = 60;

// Hash de uma senha que ninguém conhece: usado para gastar o mesmo tempo quando o
// e-mail não existe, evitando que o tempo de resposta revele quem tem conta.
const DUMMY_HASH =
  "scrypt$32768$8$1$c2FsdC1maWN0aWNpby0wMDAw$xJ0Wc3m6s1m0y3o3sQk7d8mJ9tq0m2rZb1mV0l3l1o4oB3o8m9w5oTt1c0m8b2u0s6y9l5r2n1b7x4c3v2a1Zw==";

async function clientIp(): Promise<string> {
  const list = await headers();
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "desconhecido"
  );
}

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: text(formData, "name"), email: text(formData, "email") };
  const parsed = registerSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    acceptTerms: formData.get("acceptTerms") ?? undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const limit = await rateLimit(`cadastro:${await clientIp()}`, 10, 60 * 60);
  if (!limit.allowed) return { errors: { form: retryMessage(limit.retryAfterSeconds) }, values };

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash, acceptedTermsAt: new Date() },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        errors: { email: "Já existe uma conta com este e-mail. Entre ou recupere sua senha." },
        values,
      };
    }
    throw error;
  }

  const session = await createSession(userId);
  await setSessionCookie(session.token, session.expiresAt);
  redirect(safeReturnPath(formData.get("next"), "/criar"));
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };
  const parsed = loginSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { email, password } = parsed.data;
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${await clientIp()}`, 30, 15 * 60),
    rateLimit(`login:email:${email}`, 8, 15 * 60),
  ]);
  const blocked = !byIp.allowed ? byIp : !byEmail.allowed ? byEmail : null;
  if (blocked) return { errors: { form: retryMessage(blocked.retryAfterSeconds) }, values };

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    return { errors: { form: "E-mail ou senha incorretos." }, values };
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  redirect(
    safeReturnPath(formData.get("next"), user.role === "ADMIN" ? "/admin" : "/minhas-paginas"),
  );
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const { email } = parsed.data;
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`senha:ip:${await clientIp()}`, 10, 60 * 60),
    rateLimit(`senha:email:${email}`, 3, 60 * 60),
  ]);
  const blocked = !byIp.allowed ? byIp : !byEmail.allowed ? byEmail : null;
  if (blocked) return { errors: { form: retryMessage(blocked.retryAfterSeconds) }, values };

  // A resposta é a mesma exista ou não a conta, para não revelar quem está cadastrado.
  const success =
    "Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora.";

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) return { success };

  const token = generateToken();
  await db.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
    },
  });

  const url = `${env().APP_URL}/redefinir-senha?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Crie uma nova senha — Oficina do Noel",
    ...emailLayout({
      title: `Olá, ${user.name}!`,
      paragraphs: [
        "Recebemos um pedido para criar uma nova senha na sua conta da Oficina do Noel.",
        "O link vale por 1 hora. Se não foi você, é só ignorar este e-mail: sua senha continua a mesma.",
      ],
      action: { label: "Criar nova senha", url },
    }),
  });

  return { success };
}

export async function resetPasswordAction(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: text(formData, "token"),
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.token) errors.form = "Este link é inválido. Peça um novo.";
    return { errors };
  }

  const limit = await rateLimit(`redefinir:${await clientIp()}`, 10, 60 * 60);
  if (!limit.allowed) return { errors: { form: retryMessage(limit.retryAfterSeconds) } };

  const { token, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // Marca o token como usado e troca a senha na mesma transação; o updateMany
  // condicional garante que o link só funciona uma vez, mesmo com dois cliques.
  const userId = await db.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true },
    });
    if (!record) return null;
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return null;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    return record.userId;
  });

  if (!userId) {
    return { errors: { form: "Este link expirou ou já foi usado. Peça um novo." } };
  }

  // Quem tinha acesso com a senha antiga é desconectado.
  await deleteAllSessions(userId);
  const session = await createSession(userId);
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/minhas-paginas");
}
