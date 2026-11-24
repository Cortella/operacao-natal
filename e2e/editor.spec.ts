import { expect, test } from "@playwright/test";
import { sql } from "./db";
import { continuar, photoFile, registerAndOpenEditor, wavFile } from "./helpers";

test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

test("monta uma página completa, sai e continua de onde parou", async ({ page }) => {
  await registerAndOpenEditor(page);
  const editorUrl = page.url();

  // Etapa 1 — informações básicas
  await expect(page.getByRole("textbox", { name: "Seu nome" })).toHaveValue("João");
  await page.getByLabel("Nome de quem vai receber").fill("Maria");
  await page.getByLabel("Título da página").fill("Nosso Natal");
  await page.getByLabel("Texto de introdução").fill("Preparei uma surpresa.");
  await page.getByLabel("Mensagem principal").fill("Você é o meu melhor presente.");
  await continuar(page);

  // Etapa 2 — fotos
  await expect(page.getByRole("heading", { name: "Escolha as fotos" })).toBeVisible();
  const picker = page.locator('input[type="file"][multiple]');
  await picker.setInputFiles([
    await photoFile("primeira.jpg", "#a01020"),
    await photoFile("segunda.jpg", "#208050"),
  ]);
  await expect(page.getByRole("img", { name: "Foto 2" })).toBeVisible({ timeout: 20_000 });

  // Arquivo que não é imagem é recusado com mensagem clara.
  await picker.setInputFiles({
    name: "falsa.png",
    mimeType: "image/png",
    buffer: Buffer.from("<?php echo 'oi'; ?> isto não é uma imagem de verdade"),
  });
  await expect(page.getByText(/Envie uma foto em JPG, PNG, WebP ou HEIC/)).toBeVisible();
  await expect(page.getByRole("img", { name: /^Foto \d$/ })).toHaveCount(2);

  await page.getByLabel("Legenda da foto 1").fill("Nosso primeiro Natal");
  await page.getByLabel("Legenda da foto 1").blur();
  await page.getByRole("button", { name: "Mover foto 1 para baixo" }).click();
  await expect(page.getByLabel("Legenda da foto 2")).toHaveValue("Nosso primeiro Natal");
  await continuar(page);

  // Etapa 3 — música da biblioteca
  await expect(page.getByRole("heading", { name: "Nossa música" })).toBeVisible();
  await page.getByRole("radio", { name: /Noite Feliz/ }).check();
  await continuar(page);

  // Etapa 4 — mensagem especial
  await page.getByLabel("Mensagem especial").fill("Você deixa meu Natal mais bonito. Te amo!");
  await page.getByLabel("Assinatura").fill("Do seu João");
  await continuar(page);

  // Etapa 5 — modelo
  await page.getByRole("button", { name: /Noite Feliz.*Verde-escuro/ }).click();
  await expect(page.getByRole("button", { name: /Noite Feliz.*Verde-escuro/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Ver prévia" }).click();

  // Etapa 6 — prévia fiel
  const preview = page.getByRole("article");
  await expect(preview.getByRole("heading", { name: "Nosso Natal" })).toBeVisible();
  await expect(preview.getByText("Maria", { exact: true })).toBeVisible();
  await expect(preview.getByText("Você é o meu melhor presente.")).toBeVisible();
  await expect(preview.getByText("“Você deixa meu Natal mais bonito. Te amo!”")).toBeVisible();
  await expect(preview.getByText("Nossa música")).toBeVisible();
  await expect(preview.getByRole("button", { name: /Ampliar foto/ })).toHaveCount(2);
  await continuar(page);

  // Etapa 7 — finalização
  await expect(page.getByRole("link", { name: "Ir para o pagamento" })).toBeVisible();
  await expect(page.getByText("Salvo ✓")).toBeVisible();

  // Fecha tudo e volta: o rascunho continua lá, na mesma etapa.
  await page.goto("/minhas-paginas");
  await expect(page.getByRole("heading", { name: "Nosso Natal" })).toBeVisible();
  await expect(page.getByText("Rascunho")).toBeVisible();
  await page.goto("/criar");
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByRole("link", { name: "Ir para o pagamento" })).toBeVisible();
  await page.getByRole("button", { name: "Etapa 1: Sobre" }).click();
  await expect(page.getByLabel("Nome de quem vai receber")).toHaveValue("Maria");
  await expect(page.getByLabel("Mensagem principal")).toHaveValue("Você é o meu melhor presente.");
});

test("página incompleta mostra o que falta antes do pagamento", async ({ page }) => {
  await registerAndOpenEditor(page);
  await page.getByRole("button", { name: "Etapa 7: Finalizar" }).click();
  await expect(page.getByText("Falta pouco! Complete estes itens:")).toBeVisible();
  await expect(page.getByText("Pelo menos uma foto")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para o pagamento" })).toHaveCount(0);
});

test("envia música própria com declaração de direitos", async ({ page }) => {
  await registerAndOpenEditor(page);
  await page.getByRole("button", { name: "Etapa 3: Música" }).click();
  await page.getByLabel("Nome da música").fill("A nossa canção");
  await page.getByLabel("Arquivo").setInputFiles(wavFile("cancao.wav"));
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar música" }).click();
  await expect(page.getByText("Música adicionada à sua página")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("radio", { name: /A nossa canção/ })).toBeChecked();

  await page.reload();
  await expect(page.getByRole("radio", { name: /A nossa canção/ })).toBeChecked();
});

test("uma conta não abre nem altera a página de outra", async ({ page, browser }) => {
  await registerAndOpenEditor(page);
  const editorUrl = page.url();
  const pageId = editorUrl.split("/").pop()!;

  const intruder = await browser.newContext();
  const other = await intruder.newPage();
  await registerAndOpenEditor(other, "Intrusa Teste");

  await other.goto(editorUrl);
  await expect(other.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();

  const upload = await other.request.post(`/api/paginas/${pageId}/fotos`, {
    multipart: { file: await photoFile("x.jpg", "#000000") },
  });
  expect(upload.status()).toBe(404);

  const anonymous = await browser.newContext();
  const noSession = await anonymous.request.post(
    `${new URL(editorUrl).origin}/api/paginas/${pageId}/fotos`,
    { multipart: { file: await photoFile("x.jpg", "#000000") } },
  );
  expect(noSession.status()).toBe(401);

  await intruder.close();
  await anonymous.close();
});
