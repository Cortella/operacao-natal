import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { generateToken, hashToken } from "./tokens";

export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
/** A sessão é renovada quando resta menos da metade do prazo. */
const RENEW_BELOW_MS = SESSION_MS / 2;

export type SessionUser = { id: string; name: string; email: string; role: Role };

/** Cria a sessão e devolve o token que vai para o cookie. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** Usuário dono de um token válido, ou null se a sessão não existe ou expirou. */
export async function findSessionUser(token: string): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!session) return null;

  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (remaining < RENEW_BELOW_MS) {
    await db.session.updateMany({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_MS) },
    });
  }
  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Encerra todas as sessões do usuário (troca de senha, exclusão de conta). */
export async function deleteAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
