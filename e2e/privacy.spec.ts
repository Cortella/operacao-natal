import { expect, test } from "@playwright/test";
import { sql } from "./db";
import { PASSWORD, buildPage, registerAndOpenEditor } from "./helpers";

test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

test("respostas levam os cabeçalhos de segurança", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("política de privacidade e termos estão publicados", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de privacidade" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seus direitos" })).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
});

test("limpeza periódica exige o segredo", async ({ request }) => {
  expect((await request.get("/api/cron/limpeza")).status()).toBe(401);
  const wrong = await request.get("/api/cron/limpeza", {
    headers: { Authorization: "Bearer segredo-errado" },
  });
  expect(wrong.status()).toBe(401);
});

test("exportação de dados só para a própria conta", async ({ page, browser }) => {
  const email = await registerAndOpenEditor(page);
  await page.getByLabel("Título da página").fill("Página exportável");
  await expect(page.getByText("Salvo ✓")).toBeVisible();

  const response = await page.request.get("/api/conta/exportar");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const data = await response.json();
  expect(data.conta.email).toBe(email);
  expect(data.conta.pages[0].title).toBe("Página exportável");
  expect(JSON.stringify(data)).not.toContain("passwordHash");

  const anonymous = await browser.newContext();
  const denied = await anonymous.request.get(`${new URL(page.url()).origin}/api/conta/exportar`);
  expect(denied.status()).toBe(401);
  await anonymous.close();
});

test("troca de senha exige a senha atual", async ({ page }) => {
  const email = await registerAndOpenEditor(page);
  await page.goto("/conta");
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();

  await page.getByLabel("Senha atual").fill("senha-errada");
  await page.getByLabel("Nova senha").fill("nova-senha-segura-1");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByText("A senha atual não confere.")).toBeVisible();

  await page.getByLabel("Senha atual").fill(PASSWORD);
  await page.getByLabel("Nova senha").fill("nova-senha-segura-1");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByText(/Senha alterada/)).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("nova-senha-segura-1");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/minhas-paginas/);
});

test("dono exclui a própria página", async ({ page }) => {
  const pageId = await buildPage(page);
  await page.goto("/minhas-paginas");
  await page.getByText("Excluir esta página").click();
  await page.getByRole("button", { name: /Confirmar exclusão/ }).click();
  await expect(page.getByText("Você ainda não criou nenhuma página.")).toBeVisible();
  expect(await sql(`SELECT 1 FROM "GiftPage" WHERE "id" = $1`, [pageId])).toHaveLength(0);
  expect(await sql(`SELECT 1 FROM "Photo" WHERE "pageId" = $1`, [pageId])).toHaveLength(0);
});

test("exclusão da conta apaga páginas e remove o cadastro", async ({ page }) => {
  const pageId = await buildPage(page);
  const [{ ownerId }] = await sql<{ ownerId: string }>(
    `SELECT "ownerId" FROM "GiftPage" WHERE "id" = $1`,
    [pageId],
  );
  const slug = `conta-${Date.now()}`;
  await sql(`UPDATE "GiftPage" SET "status" = 'PUBLISHED', "slug" = $2 WHERE "id" = $1`, [
    pageId,
    slug,
  ]);

  await page.goto("/conta");
  await page.getByLabel("Digite sua senha para confirmar").fill("senha-errada");
  await page.getByRole("button", { name: "Excluir minha conta e meus dados" }).click();
  await expect(page.getByText("A senha não confere.")).toBeVisible();

  await page.getByLabel("Digite sua senha para confirmar").fill(PASSWORD);
  await page.getByRole("button", { name: "Excluir minha conta e meus dados" }).click();
  await expect(page).toHaveURL(/\/\?conta=excluida$/);

  expect(await sql(`SELECT 1 FROM "User" WHERE "id" = $1`, [ownerId])).toHaveLength(0);
  expect(await sql(`SELECT 1 FROM "GiftPage" WHERE "id" = $1`, [pageId])).toHaveLength(0);
  await page.goto(`/presente/${slug}`);
  await expect(page.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
  await page.goto("/minhas-paginas");
  await expect(page).toHaveURL(/\/entrar/);
});

test("conta com compra é anonimizada e o registro do pedido permanece", async ({ page }) => {
  const pageId = await buildPage(page);
  const [{ ownerId }] = await sql<{ ownerId: string }>(
    `SELECT "ownerId" FROM "GiftPage" WHERE "id" = $1`,
    [pageId],
  );
  const orderId = `ord-lgpd-${Date.now()}`;
  await sql(
    `INSERT INTO "Order" ("id", "status", "userId", "pageId", "priceCents", "totalCents", "paidAt", "updatedAt")
     VALUES ($1, 'PAID', $2, $3, 1990, 1990, now(), now())`,
    [orderId, ownerId, pageId],
  );

  await page.goto("/conta");
  await page.getByLabel("Digite sua senha para confirmar").fill(PASSWORD);
  await page.getByRole("button", { name: "Excluir minha conta e meus dados" }).click();
  await expect(page).toHaveURL(/\/\?conta=excluida$/);

  const [user] = await sql<{ name: string; email: string }>(
    `SELECT "name", "email" FROM "User" WHERE "id" = $1`,
    [ownerId],
  );
  expect(user.name).toBe("Conta excluída");
  expect(user.email).toMatch(/@anonimo\.invalid$/);
  const [order] = await sql<{ status: string; pageId: string | null }>(
    `SELECT "status", "pageId" FROM "Order" WHERE "id" = $1`,
    [orderId],
  );
  expect(order).toEqual({ status: "PAID", pageId: null });
  expect(await sql(`SELECT 1 FROM "Session" WHERE "userId" = $1`, [ownerId])).toHaveLength(0);
});
