// Dados iniciais: modelos, músicas da plataforma, configurações e o primeiro administrador.
// É seguro rodar mais de uma vez: nada que já existe é sobrescrito.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { DEFAULT_SETTINGS } from "../src/modules/settings/schema";
import { DEFAULT_TEMPLATES } from "../src/modules/templates/config";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PUBLIC_DOMAIN =
  "Composição em domínio público; gravação sintetizada pela própria plataforma.";

const PLATFORM_MUSIC = [
  { title: "Noite Feliz", artist: "Caixinha de música", url: "/music/noite-feliz.wav" },
  { title: "Bate o Sino", artist: "Caixinha de música", url: "/music/bate-o-sino.wav" },
  { title: "Feliz Natal para Você", artist: "Caixinha de música", url: "/music/feliz-natal.wav" },
];

async function main() {
  for (const [index, template] of DEFAULT_TEMPLATES.entries()) {
    await db.template.upsert({
      where: { slug: template.slug },
      update: {},
      create: { ...template, sortOrder: index },
    });
  }
  console.log(`Modelos: ${DEFAULT_TEMPLATES.length}`);

  for (const [index, music] of PLATFORM_MUSIC.entries()) {
    const existing = await db.music.findFirst({ where: { url: music.url, source: "PLATFORM" } });
    if (!existing) {
      await db.music.create({ data: { ...music, license: PUBLIC_DOMAIN, sortOrder: index } });
    }
  }
  console.log(`Músicas da plataforma: ${PLATFORM_MUSIC.length}`);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("Configurações padrão gravadas.");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador foi criado.");
    return;
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.");
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Administrador já existe: ${email}`);
    return;
  }
  await db.user.create({
    data: {
      name: "Administrador",
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      acceptedTermsAt: new Date(),
    },
  });
  console.log(`Administrador criado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
