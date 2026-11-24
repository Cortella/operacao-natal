import { expect, test } from "@playwright/test";

test("landing mostra a oferta e leva o visitante ao cadastro", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("R$ 19,90").first()).toBeVisible();

  for (const id of ["como-funciona", "modelos", "recursos", "preco", "duvidas"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }

  // Nada pode vazar para fora da tela no celular.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);

  await page.getByRole("link", { name: "Criar minha página de Natal" }).first().click();
  await expect(page).toHaveURL(/\/cadastro\?next=%2Fcriar/);
});

test("perguntas frequentes abrem ao toque", async ({ page }) => {
  await page.goto("/#duvidas");
  const question = page.getByText("Como a pessoa recebe o presente?");
  await question.click();
  await expect(page.getByText(/Depois do pagamento você recebe um link exclusivo/)).toBeVisible();
});
