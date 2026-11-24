import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, settingsSchemas, type SettingKey, type Settings } from "./schema";

const SETTINGS_TAG = "settings";

async function loadSettings(): Promise<Settings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");

  const rows = await db.setting.findMany();
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const result = { ...DEFAULT_SETTINGS } as Record<SettingKey, unknown>;

  for (const key of Object.keys(settingsSchemas) as SettingKey[]) {
    // Valor ausente ou fora do formato cai no padrão, para a loja nunca quebrar.
    const parsed = settingsSchemas[key].safeParse(stored.get(key));
    if (parsed.success) result[key] = parsed.data;
  }
  return result as Settings;
}

/**
 * Configurações da plataforma (preço, textos da landing, regras das páginas).
 * Ficam em cache e são renovadas quando o administrador salva alterações.
 * Se o banco estiver fora do ar, devolve os padrões; a falha não entra no cache.
 */
export async function getSettings(): Promise<Settings> {
  try {
    return await loadSettings();
  } catch (error) {
    console.error("[settings] Falha ao ler configurações; usando padrões.", error);
    return DEFAULT_SETTINGS;
  }
}

/** Grava uma configuração já validada. Só pode ser chamada em Server Actions. */
export async function saveSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  const data = settingsSchemas[key].parse(value);
  await db.setting.upsert({
    where: { key },
    update: { value: data },
    create: { key, value: data },
  });
  updateTag(SETTINGS_TAG);
}
