// Tira capturas de tela de páginas em um celular emulado e no desktop.
// Uso: node scripts/screenshot.mjs <url-base> <pasta-de-saída> <caminho> [caminho...]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "@playwright/test";

const [base, outDir, ...paths] = process.argv.slice(2);
if (!base || !outDir || paths.length === 0) {
  console.error("Uso: node scripts/screenshot.mjs <url-base> <pasta> <caminho> [caminho...]");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const profiles = {
  celular: devices["Pixel 7"],
  desktop: { viewport: { width: 1280, height: 800 } },
};

for (const [name, profile] of Object.entries(profiles)) {
  const context = await browser.newContext({ ...profile, reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "inicio";
    const file = join(outDir, `${slug}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${file}  (estouro horizontal: ${overflow}px)`);
  }
  await context.close();
}
await browser.close();
