import { expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { createHmac, randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { sql, uniqueEmail } from "./db";

export const PASSWORD = "senha-de-teste-123";

/** Cria uma conta nova e termina dentro do editor, já com um rascunho aberto. */
export async function registerAndOpenEditor(page: Page, name = "João Teste"): Promise<string> {
  const email = uniqueEmail("editor");
  await page.goto("/cadastro?next=%2Fcriar");
  await page.getByLabel("Seu nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Crie uma senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await page.waitForURL(/\/criar\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: "Para quem é o presente?" })).toBeVisible();
  return email;
}

/** Foto de teste gerada na hora, com uma cor sólida. */
export async function photoFile(name: string, color: string) {
  const buffer = await sharp({
    create: { width: 900, height: 700, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();
  return { name, mimeType: "image/jpeg", buffer };
}

/** Um segundo de silêncio em WAV válido. */
export function wavFile(name: string) {
  const sampleRate = 8000;
  const data = Buffer.alloc(sampleRate * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return { name, mimeType: "audio/wav", buffer: Buffer.concat([header, data]) };
}

export const continuar = (page: Page) =>
  page.getByRole("button", { name: "Continuar", exact: true }).click();

/** Monta pelo editor uma página completa (textos, duas fotos e música) e devolve o id. */
export async function buildPage(page: Page): Promise<string> {
  await registerAndOpenEditor(page);
  const pageId = page.url().split("/").pop()!;
  await page.getByLabel("Nome de quem vai receber").fill("Maria");
  await page.getByLabel("Título da página").fill("Nosso Natal");
  await page.getByLabel("Mensagem principal").fill("Você é o meu melhor presente.");
  await page.getByRole("button", { name: "Etapa 2: Fotos" }).click();
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([await photoFile("a.jpg", "#a01020"), await photoFile("b.jpg", "#208050")]);
  await expect(page.getByRole("img", { name: "Foto 2" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Etapa 3: Música" }).click();
  await page.getByRole("radio", { name: /Noite Feliz/ }).check();
  await expect(page.getByText("Salvo ✓")).toBeVisible();
  return pageId;
}

export type TestCharge = { providerPaymentId: string; amountCents: number; status: string };

/** Cobrança mais recente gerada para a página no gateway de testes. */
export async function latestCharge(pageId: string): Promise<TestCharge> {
  const rows = await sql<TestCharge>(
    `SELECT p."providerPaymentId", p."amountCents", p."status"
     FROM "Payment" p JOIN "Order" o ON o."id" = p."orderId"
     WHERE o."pageId" = $1 ORDER BY p."createdAt" DESC LIMIT 1`,
    [pageId],
  );
  if (!rows[0]) throw new Error("Nenhuma cobrança encontrada para a página.");
  return rows[0];
}

/**
 * Envia ao webhook a notificação que o gateway de testes enviaria.
 * `secret` permite simular um remetente que não conhece o segredo.
 */
export async function sendWebhook(
  request: APIRequestContext,
  event: { paymentId: string; status: string; amountCents: number; id?: string },
  secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "",
) {
  const body = JSON.stringify({ id: event.id ?? `evt_${randomUUID()}`, ...event });
  return request.post("/api/webhooks/pagamento/teste-local", {
    headers: {
      "Content-Type": "application/json",
      "x-assinatura": createHmac("sha256", secret).update(body).digest("hex"),
    },
    data: body,
  });
}
