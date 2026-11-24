"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { createSession, deleteAllSessions } from "@/modules/auth/sessions";
import { deleteAccount, deleteOwnedPage } from "./service";

export type AccountFormState = { error?: string; success?: string };

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

const newPassword = z
  .string()
  .min(8, "A nova senha precisa ter pelo menos 8 caracteres.")
  .max(200, "A senha é longa demais.");

async function currentPasswordOk(userId: string, password: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return user ? verifyPassword(password, user.passwordHash) : false;
}

export async function changePasswordAction(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=%2Fconta");

  const limit = await rateLimit(`trocar-senha:${user.id}`, 8, 15 * 60);
  if (!limit.allowed) return { error: retryMessage(limit.retryAfterSeconds) };

  const parsed = newPassword.safeParse(text(form, "newPassword"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await currentPasswordOk(user.id, text(form, "currentPassword")))) {
    return { error: "A senha atual não confere." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data) },
  });
  // Encerra as sessões abertas em outros aparelhos e mantém esta.
  await deleteAllSessions(user.id);
  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return { success: "Senha alterada. Os outros aparelhos foram desconectados." };
}

export async function deleteAccountAction(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=%2Fconta");

  const limit = await rateLimit(`excluir-conta:${user.id}`, 5, 15 * 60);
  if (!limit.allowed) return { error: retryMessage(limit.retryAfterSeconds) };

  if (!(await currentPasswordOk(user.id, text(form, "password")))) {
    return { error: "A senha não confere." };
  }
  if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) <= 1) {
    return { error: "Esta é a única conta de administrador. Crie outra antes de excluir." };
  }

  await deleteAccount(user.id);
  await clearSessionCookie();
  redirect("/?conta=excluida");
}

/** Exclusão de uma página pelo dono (formulário de "Minhas páginas"). */
export async function deletePageAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=%2Fminhas-paginas");
  await deleteOwnedPage(text(form, "pageId"), user.id);
  redirect("/minhas-paginas");
}
