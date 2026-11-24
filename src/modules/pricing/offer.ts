import "server-only";
import { cacheLife } from "next/cache";
import { getSettings } from "@/modules/settings/service";
import { resolvePrice, type ResolvedPrice } from "./price";

/**
 * Oferta exibida nas páginas de venda. Fica em cache por poucos minutos para a
 * landing continuar estática; o valor cobrado é sempre recalculado no checkout.
 */
export async function getDisplayOffer(): Promise<ResolvedPrice> {
  "use cache";
  cacheLife("minutes");
  const { pricing } = await getSettings();
  return resolvePrice(pricing, new Date());
}

/** Preço vigente neste instante, sem cache. Use ao criar pedidos. */
export async function getCurrentPrice(): Promise<ResolvedPrice> {
  const { pricing } = await getSettings();
  return resolvePrice(pricing, new Date());
}
