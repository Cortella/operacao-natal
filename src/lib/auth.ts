import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { findSessionUser, type SessionUser } from "@/modules/auth/sessions";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { env } from "./env";

export type { SessionUser };

/**
 * Usuário logado nesta requisição, ou null. A sessão é sempre conferida no banco;
 * o `cache` do React evita repetir a consulta dentro da mesma renderização.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(token);
});

/** Exige login. Sem sessão, leva para a tela de entrada e volta para `returnTo` depois. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/entrar?next=${encodeURIComponent(returnTo)}` : "/entrar");
  }
  return user;
}

/** Exige papel de administrador. Usuário comum recebe 403. */
export async function requireAdmin(returnTo = "/admin"): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "ADMIN") forbidden();
  return user;
}

/** Só pode ser chamada em Server Actions e Route Handlers. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
