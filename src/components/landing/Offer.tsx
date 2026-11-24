"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PromotionBanner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL, type ResolvedPrice } from "@/modules/pricing/price";

/**
 * A oferta chega do servidor já resolvida; aqui só desligamos a promoção no
 * instante exato em que o prazo termina, sem depender de recarregar a página.
 */
function useLiveOffer(offer: ResolvedPrice): ResolvedPrice {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!offer.promoEndsAt) return;
    const remaining = new Date(offer.promoEndsAt).getTime() - Date.now();
    // setTimeout não aceita esperas acima de ~24 dias.
    const timer = setTimeout(() => setExpired(true), Math.min(Math.max(remaining, 0), 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [offer.promoEndsAt]);

  if (!expired || !offer.promoActive || offer.originalCents === null) return offer;
  return {
    ...offer,
    priceCents: offer.originalCents,
    originalCents: null,
    promoActive: false,
    promoEndsAt: null,
  };
}

/** Faixa do topo; aparece somente com promoção ativa. */
export function OfferBanner({ offer, action }: { offer: ResolvedPrice; action?: ReactNode }) {
  const live = useLiveOffer(offer);
  if (!live.promoActive) return null;
  return (
    <PromotionBanner endsAt={live.promoEndsAt ?? undefined} action={action}>
      {live.promoLabel}: sua página por {formatBRL(live.priceCents)}
    </PromotionBanner>
  );
}

/** Preço em destaque, com o valor cheio riscado durante promoções. */
export function OfferPrice({
  offer,
  size = "lg",
  className,
}: {
  offer: ResolvedPrice;
  size?: "md" | "lg";
  className?: string;
}) {
  const live = useLiveOffer(offer);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-3", className)}>
      {live.originalCents !== null && (
        <span className="text-lg font-bold line-through opacity-60">
          <span className="sr-only">De </span>
          {formatBRL(live.originalCents)}
        </span>
      )}
      <span className={cn("leading-none font-black", size === "lg" ? "text-6xl" : "text-4xl")}>
        {live.originalCents !== null && <span className="sr-only">por </span>}
        {formatBRL(live.priceCents)}
      </span>
    </p>
  );
}
