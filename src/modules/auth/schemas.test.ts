import { describe, expect, it } from "vitest";
import { fieldErrors, loginSchema, registerSchema } from "./schemas";

describe("validação de cadastro", () => {
  const valid = {
    name: "João",
    email: " Joao@Exemplo.com ",
    password: "12345678",
    acceptTerms: "on",
  };

  it("normaliza o e-mail", () => {
    expect(registerSchema.parse(valid).email).toBe("joao@exemplo.com");
  });

  it("exige o aceite dos termos", () => {
    const result = registerSchema.safeParse({ ...valid, acceptTerms: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).acceptTerms).toMatch(/termos/);
  });

  it("devolve uma mensagem por campo", () => {
    const result = registerSchema.safeParse({ ...valid, email: "x", password: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBe("Digite um e-mail válido.");
      expect(errors.password).toMatch(/8 caracteres/);
    }
  });
});

describe("validação de login", () => {
  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
