import { TEST_DOMAIN, sql } from "./db";

/** Limpa o que execuções anteriores deixaram: usuários de teste e contadores de tentativas. */
export default async function globalSetup() {
  const users = `SELECT "id" FROM "User" WHERE "email" LIKE $1`;
  const pattern = [`%@${TEST_DOMAIN}`];
  await sql(
    `DELETE FROM "Payment" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "userId" IN (${users}))`,
    pattern,
  );
  await sql(`DELETE FROM "Order" WHERE "userId" IN (${users})`, pattern);
  await sql(`DELETE FROM "User" WHERE "email" LIKE $1`, pattern);
  await sql(`DELETE FROM "RateLimit"`);
}
