import { expect, test } from "@playwright/test";
import { sql } from "./db";
import { buildPage } from "./helpers";

test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

const publish = (pageId: string, slug: string, expiresAt: string | null = null) =>
  sql(
    `UPDATE "GiftPage" SET "status" = 'PUBLISHED', "slug" = $2, "publishedAt" = now(),
       "expiresAt" = $3::timestamp WHERE "id" = $1`,
    [pageId, slug, expiresAt],
  );

test("presente publicado abre para qualquer pessoa com o link", async ({ page, browser }) => {
  const pageId = await buildPage(page);
  const slug = `joao-e-maria-${Date.now()}`;

  // Rascunho ainda não tem endereço público.
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(`/presente/${slug}`);
  await expect(visitor.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();

  await publish(pageId, slug);
  await visitor.goto(`/presente/${slug}`);

  // Capa: presente fechado, com os nomes.
  const cover = visitor.getByRole("dialog", { name: "Você recebeu um presente" });
  await expect(cover.getByRole("heading", { name: "Maria" })).toBeVisible();
  await expect(cover.getByText(/João preparou um presente/)).toBeVisible();
  await expect(visitor).toHaveTitle(/Um presente de Natal para Maria/);
  await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await cover.getByRole("button", { name: "Abrir presente" }).last().click();
  await expect(cover).toBeHidden();

  const gift = visitor.getByRole("article");
  await expect(gift.getByRole("heading", { name: "Nosso Natal" })).toBeVisible();
  await expect(gift.getByText("Você é o meu melhor presente.")).toBeVisible();
  await expect(gift.getByRole("button", { name: /Ampliar foto/ })).toHaveCount(2);
  // O toque em "Abrir presente" libera o áudio: a música já está tocando.
  await expect(gift.getByRole("button", { name: "Pausar Noite Feliz" })).toBeVisible();

  // Galeria amplia a foto.
  await gift.getByRole("button", { name: "Ampliar foto 1 de 2" }).click();
  await expect(visitor.getByRole("dialog", { name: "Foto ampliada" })).toBeVisible();
  await visitor.getByRole("button", { name: "Fechar" }).click();

  const overflow = await visitor.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await visitorContext.close();
});

test("presente desativado ou expirado mostra aviso amigável", async ({ page, browser }) => {
  const pageId = await buildPage(page);
  const slug = `fora-do-ar-${Date.now()}`;
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();

  await publish(pageId, slug, "2020-01-01");
  await visitor.goto(`/presente/${slug}`);
  await expect(
    visitor.getByRole("heading", { name: "Este presente não está disponível" }),
  ).toBeVisible();
  await expect(visitor.getByText("Você é o meu melhor presente.")).toHaveCount(0);

  await publish(pageId, slug);
  await sql(`UPDATE "GiftPage" SET "status" = 'DISABLED' WHERE "id" = $1`, [pageId]);
  await visitor.goto(`/presente/${slug}`);
  await expect(
    visitor.getByRole("heading", { name: "Este presente não está disponível" }),
  ).toBeVisible();
  await visitorContext.close();
});

// A resposta é transmitida aos poucos, então o status HTTP fica 200; o que importa
// é a pessoa ver o aviso e a página não ser indexada.
test("endereço inexistente mostra página não encontrada", async ({ page }) => {
  await page.goto("/presente/nao-existe-este-presente");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
});
