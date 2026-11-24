import { describe, expect, it } from "vitest";
import { checkCoupon, formatBRL, resolvePrice, type CouponRule } from "./price";

const now = new Date("2026-12-01T12:00:00-03:00");
const base = { priceCents: 1990, promoPriceCents: null, promoLabel: "Oferta", promoEndsAt: null };

describe("resolvePrice", () => {
  it("sem promoção, cobra o preço cheio", () => {
    expect(resolvePrice(base, now)).toMatchObject({
      priceCents: 1990,
      originalCents: null,
      promoActive: false,
    });
  });

  it("aplica a promoção dentro do prazo", () => {
    const price = resolvePrice(
      { ...base, promoPriceCents: 1490, promoEndsAt: "2026-12-10T00:00:00-03:00" },
      now,
    );
    expect(price).toMatchObject({ priceCents: 1490, originalCents: 1990, promoActive: true });
    expect(price.promoEndsAt).toBe("2026-12-10T00:00:00-03:00");
  });

  it("ignora promoção vencida", () => {
    const price = resolvePrice(
      { ...base, promoPriceCents: 1490, promoEndsAt: "2026-11-30T00:00:00-03:00" },
      now,
    );
    expect(price).toMatchObject({ priceCents: 1990, promoActive: false, promoEndsAt: null });
  });

  it("ignora promoção que não é mais barata", () => {
    expect(resolvePrice({ ...base, promoPriceCents: 2500 }, now).priceCents).toBe(1990);
  });
});

describe("checkCoupon", () => {
  const coupon: CouponRule = {
    type: "PERCENT",
    value: 20,
    maxRedemptions: null,
    redemptions: 0,
    startsAt: null,
    endsAt: null,
    active: true,
  };

  it("calcula desconto percentual e fixo", () => {
    expect(checkCoupon(coupon, 1990, now)).toEqual({ valid: true, discountCents: 398 });
    expect(checkCoupon({ ...coupon, type: "FIXED", value: 500 }, 1990, now)).toEqual({
      valid: true,
      discountCents: 500,
    });
  });

  it("nunca deixa o total abaixo do mínimo cobrável", () => {
    expect(checkCoupon({ ...coupon, value: 100 }, 1990, now)).toEqual({
      valid: true,
      discountCents: 1890,
    });
    expect(checkCoupon({ ...coupon, type: "FIXED", value: 99999 }, 1990, now)).toEqual({
      valid: true,
      discountCents: 1890,
    });
  });

  it("recusa cupom inativo, fora do prazo ou esgotado", () => {
    expect(checkCoupon({ ...coupon, active: false }, 1990, now).valid).toBe(false);
    expect(checkCoupon({ ...coupon, endsAt: new Date("2026-11-01") }, 1990, now).valid).toBe(false);
    expect(checkCoupon({ ...coupon, startsAt: new Date("2027-01-01") }, 1990, now).valid).toBe(
      false,
    );
    expect(checkCoupon({ ...coupon, maxRedemptions: 5, redemptions: 5 }, 1990, now).valid).toBe(
      false,
    );
  });
});

describe("formatBRL", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(1990)).toBe("R$ 19,90");
    expect(formatBRL(100000)).toBe("R$ 1.000,00");
  });
});
