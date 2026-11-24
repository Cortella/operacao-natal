import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "../src/lib/password";
import { createUser, sql, uniqueEmail } from "./db";
import { PASSWORD, buildPage, registerAndOpenEditor, wavFile } from "./helpers";

test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

async function loginAsAdmin(page: Page) {
  const email = uniqueEmail("admin");
  await createUser({
    name: "Admin Teste",
    email,
    passwordHash: await hashPassword(PASSWORD),
    role: "ADMIN",
  });
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
}

const openArea = async (page: Page, path: string, heading: string) => {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
};

test("resumo mostra os indicadores e as áreas do painel", async ({ page }) => {
  await loginAsAdmin(page);
  for (const label of [
    "Faturamento",
    "Vendas",
    "Pagamentos aprovados",
    "Pagamentos pendentes",
    "Páginas criadas",
    "Páginas publicadas",
  ]) {
    await expect(page.locator("main ul.grid").getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText(/Gateway de testes ativo/)).toBeVisible();

  await page.getByRole("link", { name: "Vendas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vendas e transações" })).toBeVisible();
});

test("usuário comum não entra em nenhuma área do painel", async ({ page }) => {
  await registerAndOpenEditor(page);
  for (const path of ["/admin/vendas", "/admin/comercial", "/admin/paginas", "/admin/cupons"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Esta porta é só dos duendes" })).toBeVisible();
  }
});

test("preço, promoção e textos alterados no painel aparecem na landing", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();

  try {
    await openArea(page, "/admin/comercial", "Preço e promoções");
    await page.getByLabel("Preço promocional (R$)").fill("14,90");
    await page.getByLabel("Texto da faixa de promoção").fill("Semana do Noel");
    await page.getByLabel("Promoção válida até").fill("2099-12-25T00:00");
    await page.getByRole("button", { name: "Salvar preço" }).click();
    await expect(page.getByText("Preço atualizado.")).toBeVisible();
    await expect(page.getByText(/Valor cobrado agora: R\$ 14,90/)).toBeVisible();

    await visitor.goto("/");
    await expect(visitor.getByText("R$ 14,90").first()).toBeVisible();
    await expect(visitor.getByText(/Semana do Noel: sua página por R\$ 14,90/)).toBeVisible();
    await expect(visitor.getByLabel("Tempo restante da oferta")).toBeVisible();

    // Promoção maior ou igual ao preço normal é recusada.
    await page.getByLabel("Preço promocional (R$)").fill("25,00");
    await page.getByRole("button", { name: "Salvar preço" }).click();
    await expect(page.getByText(/precisa ser menor que o preço normal/)).toBeVisible();

    await openArea(page, "/admin/conteudo", "Textos da landing");
    await page.getByLabel("Título principal").fill("Um Natal inesquecível");
    await page.getByRole("button", { name: "Salvar textos" }).click();
    await expect(page.getByText("Textos da landing atualizados.")).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Um Natal inesquecível");
  } finally {
    // Devolve as configurações ao padrão para não afetar os outros testes.
    await page.goto("/admin/conteudo");
    await page.getByRole("button", { name: "Restaurar textos padrão" }).click();
    await expect(page.getByText("Textos padrão restaurados.")).toBeVisible();
    await page.goto("/admin/comercial");
    await page.getByLabel("Preço normal (R$)").fill("19,90");
    await page.getByLabel("Preço promocional (R$)").fill("");
    await page.getByLabel("Promoção válida até").fill("");
    await page.getByRole("button", { name: "Salvar preço" }).click();
    await expect(page.getByText(/Valor cobrado agora: R\$ 19,90/)).toBeVisible();
  }

  await visitor.goto("/");
  await expect(visitor.getByText("R$ 19,90").first()).toBeVisible();
  await expect(visitor.getByText("Semana do Noel")).toHaveCount(0);
  await visitorContext.close();
});

test("cupons: criar, recusar duplicado, desativar e excluir", async ({ page }) => {
  await loginAsAdmin(page);
  const code = `PAINEL${Date.now()}`;
  await openArea(page, "/admin/cupons", "Cupons de desconto");

  const create = async () => {
    await page.getByLabel("Código").fill(code.toLowerCase());
    await page.getByLabel("Valor", { exact: true }).fill("15");
    await page.getByLabel("Limite de usos").fill("50");
    await page.getByRole("button", { name: "Criar cupom" }).click();
  };
  await create();
  await expect(page.getByText(`Cupom ${code} criado.`)).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: code });
  await expect(row).toContainText("15%");
  await expect(row).toContainText("0 de 50");

  await create();
  await expect(page.getByText("Já existe um cupom com este código.")).toBeVisible();

  await row.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByText("Cupom desativado.")).toBeVisible();
  await expect(row).toContainText("Inativo");

  await row.getByRole("button", { name: `Excluir cupom ${code}` }).click();
  await expect(page.getByText("Cupom excluído.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: code })).toHaveCount(0);
});

test("páginas: buscar, editar, desativar, reativar e excluir", async ({ page, browser }) => {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const pageId = await buildPage(owner);
  const marker = `Natal ${Date.now()}`;
  await owner.getByRole("button", { name: "Etapa 1: Sobre" }).click();
  await owner.getByLabel("Título da página").fill(marker);
  await expect(owner.getByText("Salvo ✓")).toBeVisible();
  // Página paga e publicada, direto no banco (o fluxo de pagamento tem teste próprio).
  const slug = `painel-${Date.now()}`;
  await sql(
    `UPDATE "GiftPage" SET "status" = 'PUBLISHED', "slug" = $2, "publishedAt" = now() WHERE "id" = $1`,
    [pageId, slug],
  );
  await sql(
    `INSERT INTO "Order" ("id", "status", "userId", "pageId", "priceCents", "totalCents", "paidAt", "updatedAt")
     SELECT $2, 'PAID', "ownerId", "id", 1990, 1990, now(), now() FROM "GiftPage" WHERE "id" = $1`,
    [pageId, `ord-${slug}`],
  );

  await loginAsAdmin(page);
  await openArea(page, "/admin/paginas", "Páginas");
  await page.getByLabel("Buscar").fill(marker);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("1 página(s) encontrada(s).")).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: marker });
  await expect(row).toContainText("Maria");
  await expect(row).toContainText("Publicada");

  // Editar
  await row.getByRole("link", { name: "Ver / editar" }).click();
  await expect(page.getByRole("heading", { name: "Detalhes da página" })).toBeVisible();
  await page.getByLabel("Título").fill(`${marker} (revisado)`);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Página atualizada.")).toBeVisible();
  const [saved] = await sql<{ title: string }>(`SELECT "title" FROM "GiftPage" WHERE "id" = $1`, [
    pageId,
  ]);
  expect(saved.title).toBe(`${marker} (revisado)`);

  // Desativar: sai do ar e o dono não consegue recolocar.
  await page.getByRole("button", { name: "Desativar página" }).click();
  await expect(page.getByText("Página desativada.")).toBeVisible();
  await owner.goto(`/presente/${slug}`);
  await expect(
    owner.getByRole("heading", { name: "Este presente não está disponível" }),
  ).toBeVisible();
  await owner.goto("/minhas-paginas");
  await expect(owner.getByText("Fora do ar", { exact: true })).toBeVisible();
  await expect(owner.getByRole("button", { name: "Colocar no ar" })).toHaveCount(0);

  // Reativar
  await page.getByRole("button", { name: "Reativar página" }).click();
  await expect(page.getByText("Página reativada.")).toBeVisible();
  await owner.goto(`/presente/${slug}`);
  await expect(owner.getByRole("dialog", { name: "Você recebeu um presente" })).toBeVisible();

  // Excluir exige confirmação e mantém o pedido como registro.
  await page.getByLabel('Digite "EXCLUIR" para confirmar').fill("excluir");
  await page.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(page.getByText('Digite "EXCLUIR" para confirmar.')).toBeVisible();
  await page.getByLabel('Digite "EXCLUIR" para confirmar').fill("EXCLUIR");
  await page.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(page.getByText("Página excluída.")).toBeVisible();

  expect(await sql(`SELECT 1 FROM "GiftPage" WHERE "id" = $1`, [pageId])).toHaveLength(0);
  expect(await sql(`SELECT 1 FROM "Photo" WHERE "pageId" = $1`, [pageId])).toHaveLength(0);
  const [order] = await sql<{ pageId: string | null; status: string }>(
    `SELECT "pageId", "status" FROM "Order" WHERE "id" = $1`,
    [`ord-${slug}`],
  );
  expect(order).toEqual({ pageId: null, status: "PAID" });

  await openArea(page, "/admin/vendas", "Vendas e transações");
  await expect(page.getByText("Página excluída").first()).toBeVisible();
  await ownerContext.close();
});

test("modelos e músicas cadastrados no painel chegam ao editor", async ({ page, browser }) => {
  await loginAsAdmin(page);
  const name = `Modelo ${Date.now()}`;
  const song = `Canção ${Date.now()}`;

  await openArea(page, "/admin/modelos", "Modelos de página");
  const newForm = page.locator("form").filter({ hasText: "Criar modelo" });
  await newForm.getByLabel("Nome").fill(name);
  await newForm.getByLabel("Descrição").fill("Creme com dourado, criado no teste.");
  await newForm.getByLabel("Fundo do cenário").selectOption("cream");
  await newForm.getByLabel("Cor de destaque").selectOption("gold");
  await newForm.getByRole("button", { name: "Criar modelo" }).click();
  await expect(page.getByText(`Modelo "${name}" criado.`)).toBeVisible();

  await openArea(page, "/admin/musicas", "Músicas autorizadas");
  await page.getByLabel("Título").fill(song);
  await page
    .getByLabel("Licença ou autorização de uso")
    .fill("Gravação própria feita para o teste.");
  await page.getByLabel("Arquivo").setInputFiles(wavFile("teste.wav"));
  await page.getByRole("button", { name: "Cadastrar música" }).click();
  await expect(page.getByText("Música cadastrada")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("row").filter({ hasText: song })).toContainText("Ativa");

  // O comprador encontra os dois no editor.
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await registerAndOpenEditor(buyer);
  await buyer.getByRole("button", { name: "Etapa 3: Música" }).click();
  await expect(buyer.getByRole("radio", { name: new RegExp(song) })).toBeVisible();
  await buyer.getByRole("button", { name: "Etapa 5: Modelo" }).click();
  await expect(buyer.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  await buyerContext.close();

  // Limpeza pelo próprio painel.
  await page.getByRole("button", { name: `Excluir ${song}` }).click();
  await expect(page.getByText("Música excluída.")).toBeVisible();
  await openArea(page, "/admin/modelos", "Modelos de página");
  await page.getByRole("button", { name: `Excluir modelo ${name}` }).click();
  await expect(page.getByText("Modelo excluído.")).toBeVisible();
});
