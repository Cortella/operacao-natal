import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";
import { buildPage, latestCharge, sendWebhook } from "./helpers";

// Estes testes usam o gateway "teste-local": nenhuma cobrança real acontece, mas o
// caminho exercitado é o de produção (pedido, webhook assinado, nova consulta ao
// gateway, publicação).

test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

async function openCheckout(page: Page, pageId: string) {
  await page.goto(`/checkout/${pageId}`);
  await expect(page.getByRole("heading", { name: "Finalizar presente" })).toBeVisible();
}

async function generatePix(page: Page) {
  await page.getByRole("button", { name: /^Pagar R\$/ }).click();
  await expect(page.getByRole("heading", { name: "Pague com PIX" })).toBeVisible();
}

const pageStatus = async (pageId: string) =>
  (await sql<{ status: string }>(`SELECT "status" FROM "GiftPage" WHERE "id" = $1`, [pageId]))[0]
    .status;

test("fluxo completo: checkout, webhook, publicação e compartilhamento", async ({
  page,
  request,
  browser,
}) => {
  const pageId = await buildPage(page);

  await page.getByRole("button", { name: "Etapa 7: Finalizar" }).click();
  await page.getByRole("link", { name: "Ir para o pagamento" }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${pageId}$`));
  await expect(page.getByText("R$ 19,90").first()).toBeVisible();
  await expect(page.getByText(/Ambiente de testes local/)).toBeVisible();

  await generatePix(page);
  await expect(page.getByLabel("PIX copia e cola")).toHaveValue(/PIX-DE-TESTE/);
  await expect(page.getByRole("img", { name: "QR code do PIX" })).toBeVisible();
  expect(await pageStatus(pageId)).toBe("PENDING_PAYMENT");

  const charge = await latestCharge(pageId);
  expect(charge.amountCents).toBe(1990);

  // Abrir a página de sucesso sem pagar não libera nada.
  const sneaky = await page.context().newPage();
  await sneaky.goto(`/checkout/${pageId}/sucesso`);
  await expect(sneaky).toHaveURL(new RegExp(`/checkout/${pageId}$`));
  await sneaky.close();
  expect(await pageStatus(pageId)).toBe("PENDING_PAYMENT");

  // Notificação com assinatura errada é recusada.
  const forged = await sendWebhook(
    request,
    { paymentId: charge.providerPaymentId, status: "APPROVED", amountCents: 1990 },
    "segredo-errado",
  );
  expect(forged.status()).toBe(401);
  expect(await pageStatus(pageId)).toBe("PENDING_PAYMENT");

  // Notificação legítima: a tela do comprador avança sozinha.
  const eventId = `evt_e2e_${Date.now()}`;
  const approved = await sendWebhook(request, {
    id: eventId,
    paymentId: charge.providerPaymentId,
    status: "APPROVED",
    amountCents: 1990,
  });
  expect(approved.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/checkout/${pageId}/sucesso$`), { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Seu presente está pronto!" })).toBeVisible();

  const link = await page.getByLabel("Link exclusivo do presente").inputValue();
  expect(link).toMatch(/\/presente\/joao-e-maria(-[a-z0-9]+)?$/);
  const whatsapp = page.getByRole("link", { name: "Enviar pelo WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent((await whatsapp.getAttribute("href")) ?? "")).toContain(link);

  // A mesma notificação entregue de novo não repete nada.
  const again = await sendWebhook(request, {
    id: eventId,
    paymentId: charge.providerPaymentId,
    status: "APPROVED",
    amountCents: 1990,
  });
  expect(await again.json()).toMatchObject({ ok: true, duplicate: true });
  const orders = await sql<{ status: string }>(`SELECT "status" FROM "Order" WHERE "pageId" = $1`, [
    pageId,
  ]);
  expect(orders).toEqual([{ status: "PAID" }]);
  expect((await latestCharge(pageId)).status).toBe("APPROVED");

  // Qualquer pessoa com o link abre o presente.
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(new URL(link).pathname);
  await expect(visitor.getByRole("dialog", { name: "Você recebeu um presente" })).toBeVisible();

  // O dono tira a página do ar e recoloca.
  await page.goto("/minhas-paginas");
  await expect(page.getByText("No ar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tirar do ar" }).click();
  await expect(page.getByText("Fora do ar", { exact: true })).toBeVisible();
  await visitor.goto(new URL(link).pathname);
  await expect(
    visitor.getByRole("heading", { name: "Este presente não está disponível" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Colocar no ar" }).click();
  await expect(page.getByText("No ar", { exact: true })).toBeVisible();
  await visitor.goto(new URL(link).pathname);
  await expect(visitor.getByRole("dialog", { name: "Você recebeu um presente" })).toBeVisible();
  await visitorContext.close();

  // Página paga não gera nova cobrança.
  await page.goto(`/checkout/${pageId}`);
  await expect(page).toHaveURL(new RegExp(`/checkout/${pageId}/sucesso$`));
});

test("pagamento com valor diferente do pedido não publica a página", async ({ page, request }) => {
  const pageId = await buildPage(page);
  await openCheckout(page, pageId);
  await generatePix(page);
  const charge = await latestCharge(pageId);

  const response = await sendWebhook(request, {
    paymentId: charge.providerPaymentId,
    status: "APPROVED",
    amountCents: 100,
  });
  expect(response.status()).toBe(200);
  expect(await pageStatus(pageId)).toBe("PENDING_PAYMENT");
  expect((await latestCharge(pageId)).status).toBe("PENDING");
});

test("cupom válido reduz o valor cobrado; inválido é recusado", async ({ page, request }) => {
  const code = `E2E${Date.now()}`;
  await sql(
    `INSERT INTO "Coupon" ("id", "code", "type", "value", "updatedAt")
     VALUES ($1, $1, 'PERCENT', 20, now())`,
    [code],
  );
  const pageId = await buildPage(page);
  await openCheckout(page, pageId);

  await page.getByLabel("Cupom de desconto").fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom não encontrado.")).toBeVisible();

  await page.getByLabel("Cupom de desconto").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText(`Cupom ${code} aplicado`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar R$ 15,92" })).toBeVisible();

  await generatePix(page);
  const charge = await latestCharge(pageId);
  expect(charge.amountCents).toBe(1592);

  await sendWebhook(request, {
    paymentId: charge.providerPaymentId,
    status: "APPROVED",
    amountCents: 1592,
  });
  await expect(page).toHaveURL(/\/sucesso$/, { timeout: 20_000 });
  const [coupon] = await sql<{ redemptions: number }>(
    `SELECT "redemptions" FROM "Coupon" WHERE "code" = $1`,
    [code],
  );
  expect(coupon.redemptions).toBe(1);
});

test("pagamento recusado permite tentar de novo", async ({ page, request }) => {
  const pageId = await buildPage(page);
  await openCheckout(page, pageId);
  await generatePix(page);
  const charge = await latestCharge(pageId);

  await sendWebhook(request, {
    paymentId: charge.providerPaymentId,
    status: "REJECTED",
    amountCents: 1990,
  });
  await expect(page.getByText("O pagamento anterior não foi concluído")).toBeVisible({
    timeout: 20_000,
  });
  expect(await pageStatus(pageId)).toBe("PENDING_PAYMENT");

  await generatePix(page);
  expect((await latestCharge(pageId)).providerPaymentId).not.toBe(charge.providerPaymentId);
});

test("ninguém paga ou vê o checkout da página de outra conta", async ({ page, browser }) => {
  const pageId = await buildPage(page);
  const context = await browser.newContext();
  const other = await context.newPage();
  await buildPage(other);

  await other.goto(`/checkout/${pageId}`);
  await expect(other.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
  await other.goto(`/checkout/${pageId}/sucesso`);
  await expect(other.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
  await context.close();
});

test("webhook de gateway desconhecido responde 404", async ({ request }) => {
  const response = await request.post("/api/webhooks/pagamento/gateway-inexistente", {
    data: "{}",
  });
  expect(response.status()).toBe(404);
});
