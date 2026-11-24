import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "../src/lib/password";
import { generateToken, hashToken } from "../src/modules/auth/tokens";
import { randomUUID } from "node:crypto";
import { createUser, sql, uniqueEmail, userIdByEmail } from "./db";

const PASSWORD = "senha-de-teste-123";

// Todos os testes saem do mesmo IP; sem isso, o limite de cadastros por hora os barraria.
test.beforeEach(async () => {
  await sql(`DELETE FROM "RateLimit"`);
});

async function register(page: Page, email: string, name = "Maria Teste") {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Crie uma senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  // Sai do cadastro já com sessão; o destino padrão é o editor.
  await page.waitForURL(/\/criar/);
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("visitante é levado ao login ao abrir área restrita", async ({ page }) => {
  await page.goto("/minhas-paginas");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fminhas-paginas/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);
});

test("cadastro valida os campos e mostra mensagens claras", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("M");
  await page.getByLabel("E-mail").fill("nao-e-email");
  await page.getByLabel("Crie uma senha").fill("123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText("Digite seu nome.")).toBeVisible();
  await expect(page.getByText("Digite um e-mail válido.")).toBeVisible();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible();
  await expect(page.getByText(/precisa aceitar os termos/)).toBeVisible();
  // O que a pessoa já digitou não é apagado.
  await expect(page.getByLabel("E-mail")).toHaveValue("nao-e-email");
});

test("cadastro, saída e novo login", async ({ page }) => {
  const email = uniqueEmail("fluxo");
  await register(page, email);

  await page.goto("/minhas-paginas");
  await expect(page.getByRole("heading", { name: "Olá, Maria!" })).toBeVisible();

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "noel_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto("/minhas-paginas");
  await expect(page).toHaveURL(/\/entrar/);

  await login(page, email, "senha-errada");
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

  await login(page, email);
  await expect(page).toHaveURL(/\/minhas-paginas/);
  await expect(page.getByRole("heading", { name: "Olá, Maria!" })).toBeVisible();
});

test("e-mail já cadastrado é recusado", async ({ page }) => {
  const email = uniqueEmail("duplicado");
  await register(page, email);
  await page.context().clearCookies();

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Outra Pessoa");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Crie uma senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText(/Já existe uma conta com este e-mail/)).toBeVisible();
});

test("login ignora destino externo no parâmetro next", async ({ page }) => {
  const email = uniqueEmail("retorno");
  await register(page, email);
  await page.context().clearCookies();

  await page.goto("/entrar?next=https%3A%2F%2Fexemplo.com");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/localhost:\d+\/minhas-paginas/);
});

test("usuário comum recebe 403 no painel; administrador entra", async ({ page }) => {
  const email = uniqueEmail("comum");
  await register(page, email);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Esta porta é só dos duendes" })).toBeVisible();
  await expect(page.getByText("Painel da Oficina")).toHaveCount(0);

  const adminEmail = uniqueEmail("admin");
  await createUser({
    name: "Admin Teste",
    email: adminEmail,
    passwordHash: await hashPassword(PASSWORD),
    role: "ADMIN",
  });

  await page.context().clearCookies();
  await login(page, adminEmail);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
});

test("recuperação de senha: o link funciona uma única vez", async ({ page }) => {
  const email = uniqueEmail("senha");
  await register(page, email);
  await page.context().clearCookies();

  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail da sua conta").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Confira seu e-mail")).toBeVisible();

  // O e-mail não é enviado nos testes; criamos um token equivalente direto no banco.
  const token = generateToken();
  const userId = await userIdByEmail(email);
  const issued = await sql(`SELECT 1 FROM "PasswordResetToken" WHERE "userId" = $1`, [userId]);
  expect(issued).toHaveLength(1);
  await sql(
    `INSERT INTO "PasswordResetToken" ("id", "tokenHash", "userId", "expiresAt")
     VALUES ($1, $2, $3, now() + interval '1 minute')`,
    [randomUUID(), hashToken(token), userId],
  );

  await page.goto(`/redefinir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill("outra-senha-456");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/minhas-paginas/);

  await page.context().clearCookies();
  await page.goto(`/redefinir-senha?token=${token}`);
  await page.getByLabel("Nova senha").fill("terceira-senha-789");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText(/expirou ou já foi usado/)).toBeVisible();

  await login(page, email, PASSWORD);
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await login(page, email, "outra-senha-456");
  await expect(page).toHaveURL(/\/minhas-paginas/);
});
