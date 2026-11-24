import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas uma única vez.
 * Integrações ainda não configuradas (storage, pagamento) são opcionais aqui
 * e verificadas no ponto de uso, para que o projeto suba sem elas.
 */
const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z
    .url()
    .transform((value) => value.replace(/\/+$/, ""))
    .default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  S3_ENDPOINT: optional,
  S3_REGION: optional,
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_PUBLIC_URL: optional,
  S3_FORCE_PATH_STYLE: optional,
  LEGAL_NAME: optional,
  LEGAL_DOCUMENT: optional,
  LEGAL_EMAIL: optional,
  CRON_SECRET: optional,
  PAYMENT_PROVIDER: optional,
  PAYMENT_ACCESS_TOKEN: optional,
  PAYMENT_WEBHOOK_SECRET: optional,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
