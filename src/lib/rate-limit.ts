import { db } from "./db";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Limite de tentativas por janela fixa, gravado no banco para valer em todas as
 * instâncias da aplicação. O incremento é atômico (um único comando SQL).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= now() THEN now() + make_interval(secs => ${windowSeconds})
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", "resetAt"
  `;
  const { count, resetAt } = rows[0];
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
  };
}

/** Texto amigável para "tente de novo em X". */
export function retryMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1
    ? "Muitas tentativas. Aguarde um minuto e tente de novo."
    : `Muitas tentativas. Tente de novo em ${minutes} minutos.`;
}
