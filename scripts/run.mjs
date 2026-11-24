// Executa uma ferramenta do node_modules a partir do caminho real do projeto.
// No Windows, um terminal aberto com o drive em minúscula faz Vitest e Playwright
// carregarem seus módulos duas vezes, e os testes falham ao iniciar.
// Uso: node scripts/run.mjs <caminho dentro de node_modules> [argumentos]
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join } from "node:path";

const root = realpathSync.native(process.cwd());
const [tool, ...args] = process.argv.slice(2);

const result = spawnSync(process.execPath, [join(root, "node_modules", tool), ...args], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
