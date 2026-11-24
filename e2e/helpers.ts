import { expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { uniqueEmail } from "./db";

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
