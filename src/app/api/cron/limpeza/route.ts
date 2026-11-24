import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { deleteObjects } from "@/integrations/storage";

const DAY = 24 * 60 * 60 * 1000;

function authorized(request: NextRequest): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Limpeza periódica (minimização de dados): remove o que não tem mais uso.
 * Deve ser chamada por um agendador com o cabeçalho "Authorization: Bearer CRON_SECRET"
 * (na Vercel, o agendamento em vercel.json envia esse cabeçalho automaticamente).
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const now = new Date();
  const [sessions, resetTokens, rateLimits] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - DAY) } },
    }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  // Envios de música que nunca foram concluídos.
  const staleMusic = await db.music.findMany({
    where: { active: false, source: "USER", createdAt: { lt: new Date(now.getTime() - DAY) } },
    select: { id: true, storageKey: true },
  });
  await db.music.deleteMany({ where: { id: { in: staleMusic.map((music) => music.id) } } });
  await deleteObjects(staleMusic.flatMap((music) => (music.storageKey ? [music.storageKey] : [])));

  return NextResponse.json({
    sessions: sessions.count,
    resetTokens: resetTokens.count,
    rateLimits: rateLimits.count,
    unfinishedUploads: staleMusic.length,
  });
}
