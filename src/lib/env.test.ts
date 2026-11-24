import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("aceita a configuração mínima e aplica os padrões", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5433/db" });
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
  });

  it("remove a barra final de APP_URL", () => {
    const env = parseEnv({ DATABASE_URL: "x", APP_URL: "https://exemplo.com/" });
    expect(env.APP_URL).toBe("https://exemplo.com");
  });

  it("trata integrações vazias como não configuradas", () => {
    const env = parseEnv({ DATABASE_URL: "x", PAYMENT_ACCESS_TOKEN: "" });
    expect(env.PAYMENT_ACCESS_TOKEN).toBeUndefined();
  });

  it("falha com mensagem clara quando falta DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
});
