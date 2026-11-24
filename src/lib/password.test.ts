import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("senhas", () => {
  it("confere a senha correta e rejeita a errada", async () => {
    const hash = await hashPassword("Natal@2026!");
    expect(await verifyPassword("Natal@2026!", hash)).toBe(true);
    expect(await verifyPassword("natal@2026!", hash)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha", async () => {
    expect(await hashPassword("abc12345")).not.toBe(await hashPassword("abc12345"));
  });

  it("rejeita valores armazenados inválidos sem lançar erro", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "texto-puro")).toBe(false);
    expect(await verifyPassword("x", "scrypt$0$8$1$AAAA$AAAA")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1073741824$8$1$AAAA$AAAA")).toBe(false);
  });
});
