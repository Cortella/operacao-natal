import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt com os parâmetros gravados junto do hash, para poder endurecer no futuro
// sem invalidar as senhas existentes.
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
/** Teto de custo aceito ao verificar, para um hash adulterado não esgotar a memória. */
const MAX_COST = N * R * 4;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      length,
      { N: n, r, p, maxmem: 128 * n * r * 2 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const [cost, block, parallel] = [Number(n), Number(r), Number(p)];
  if ([cost, block, parallel].some((value) => !Number.isInteger(value) || value <= 0)) return false;
  if (cost * block > MAX_COST) return false;

  const expected = Buffer.from(hash, "base64");
  try {
    const key = await derive(
      password,
      Buffer.from(salt, "base64"),
      cost,
      block,
      parallel,
      expected.length,
    );
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
