import type { Settings } from "@/modules/settings/schema";

export type ResolvedPrice = {
  /** Valor cobrado agora, em centavos. */
  priceCents: number;
  /** Preço cheio riscado, quando há promoção ativa. */
  originalCents: number | null;
  promoActive: boolean;
  promoLabel: string;
  /** Fim da promoção ativa (ISO), se tiver prazo. */
  promoEndsAt: string | null;
};

/** Preço vigente em `now`, considerando promoção e prazo de validade. */
export function resolvePrice(pricing: Settings["pricing"], now: Date = new Date()): ResolvedPrice {
  const { priceCents, promoPriceCents, promoLabel, promoEndsAt } = pricing;
  const notExpired = !promoEndsAt || new Date(promoEndsAt).getTime() > now.getTime();
  const promoActive = promoPriceCents !== null && promoPriceCents < priceCents && notExpired;

  return {
    priceCents: promoActive ? promoPriceCents : priceCents,
    originalCents: promoActive ? priceCents : null,
    promoActive,
    promoLabel,
    promoEndsAt: promoActive ? promoEndsAt : null,
  };
}

export type CouponRule = {
  type: "PERCENT" | "FIXED";
  value: number;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

export type CouponCheck = { valid: true; discountCents: number } | { valid: false; reason: string };

/** Valor mínimo cobrado: gateways não aceitam cobranças abaixo disso. */
export const MIN_CHARGE_CENTS = 100;

/** Valida o cupom e calcula o desconto sobre `priceCents`. */
export function checkCoupon(
  coupon: CouponRule,
  priceCents: number,
  now: Date = new Date(),
): CouponCheck {
  if (!coupon.active) return { valid: false, reason: "Este cupom não está mais disponível." };
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    return { valid: false, reason: "Este cupom ainda não começou a valer." };
  }
  if (coupon.endsAt && coupon.endsAt.getTime() <= now.getTime()) {
    return { valid: false, reason: "Este cupom expirou." };
  }
  if (coupon.maxRedemptions !== null && coupon.redemptions >= coupon.maxRedemptions) {
    return { valid: false, reason: "Este cupom já atingiu o limite de usos." };
  }

  const raw =
    coupon.type === "PERCENT" ? Math.round((priceCents * coupon.value) / 100) : coupon.value;
  // O desconto nunca leva o total abaixo do mínimo cobrável.
  const discountCents = Math.max(0, Math.min(raw, priceCents - MIN_CHARGE_CENTS));
  return { valid: true, discountCents };
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1990 -> "R$ 19,90" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100).replace(/ /g, " ");
}
