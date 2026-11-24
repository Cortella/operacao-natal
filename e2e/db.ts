import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

// Os testes falam com o banco por SQL direto: o cliente gerado do Prisma é um
// módulo ES e não carrega no executor do Playwright.

/** Executa um comando SQL em uma conexão própria. */
export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Todos os usuários criados pelos testes usam este domínio. */
export const TEST_DOMAIN = "e2e.oficinadonoel.test";

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${TEST_DOMAIN}`;

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: "USER" | "ADMIN";
}): Promise<string> {
  const id = randomUUID();
  await sql(
    `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::"Role", now())`,
    [id, data.name, data.email, data.passwordHash, data.role ?? "USER"],
  );
  return id;
}

export async function userIdByEmail(email: string): Promise<string> {
  const rows = await sql<{ id: string }>(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
  if (!rows[0]) throw new Error(`Usuário de teste não encontrado: ${email}`);
  return rows[0].id;
}
