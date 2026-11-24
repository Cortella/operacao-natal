// Executa o Vitest a partir do caminho real do projeto.
// No Windows, um terminal aberto em "c:\..." (drive em minúscula) faz o Vitest
// carregar seus módulos duas vezes e todos os testes falham ao iniciar.
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join } from "node:path";

const root = realpathSync.native(process.cwd());
const vitest = join(root, "node_modules", "vitest", "vitest.mjs");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [vitest, ...(args.length ? args : ["run"])], {
  cwd: root,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
