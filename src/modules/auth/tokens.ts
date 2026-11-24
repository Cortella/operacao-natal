import { createHash, randomBytes } from "node:crypto";

/** Token aleatório de 256 bits, seguro para cookies e links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Só o hash vai para o banco: um vazamento da tabela não entrega sessões válidas. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
