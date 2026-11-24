import { describe, expect, it } from "vitest";
import { FALLBACK_TEMPLATE_CONFIG } from "@/modules/templates/config";
import { baseSlug, detailsSchema, missingForCheckout, slugify, type GiftPageView } from "./schema";

const page: GiftPageView = {
  id: "p1",
  slug: null,
  status: "DRAFT",
  senderName: "João",
  recipientName: "Maria",
  title: "Feliz Natal",
  introText: "",
  mainMessage: "Te amo",
  special: null,
  photos: [{ id: "f1", url: "/x.webp", caption: "" }],
  music: null,
  templateId: "t1",
  template: FALLBACK_TEMPLATE_CONFIG,
};

describe("slug", () => {
  it("remove acentos, símbolos e espaços", () => {
    expect(slugify("  João & Maria!! ")).toBe("joao-e-maria");
    expect(slugify("Ação   Coração")).toBe("acao-coracao");
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("💝")).toBe("");
  });

  it("monta o endereço a partir dos primeiros nomes", () => {
    expect(baseSlug("João Silva", "Maria Souza")).toBe("joao-e-maria");
    expect(baseSlug("", "Vovó Lúcia")).toBe("vovo");
    expect(baseSlug("", "")).toBe("presente");
  });
});

describe("detailsSchema", () => {
  it("apara espaços, remove caracteres de controle e aceita rascunho vazio", () => {
    const parsed = detailsSchema.parse({
      senderName: "  João\u0000 ",
      recipientName: "",
      title: "",
      introText: "",
      mainMessage: "linha 1\nlinha 2",
    });
    expect(parsed.senderName).toBe("João");
    expect(parsed.mainMessage).toBe("linha 1\nlinha 2");
  });

  it("recusa textos acima do limite", () => {
    const result = detailsSchema.safeParse({
      senderName: "a".repeat(61),
      recipientName: "",
      title: "",
      introText: "",
      mainMessage: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("missingForCheckout", () => {
  it("não aponta nada em uma página completa", () => {
    expect(missingForCheckout(page)).toEqual([]);
  });

  it("aponta cada pendência com a etapa onde resolver", () => {
    const missing = missingForCheckout({ ...page, title: "", photos: [], templateId: null });
    expect(missing.map((item) => item.step)).toEqual([1, 2, 5]);
  });
});
