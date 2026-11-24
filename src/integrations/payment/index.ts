import "server-only";
import { env } from "@/lib/env";
import { LOCAL_TEST_PROVIDER, createLocalTestProvider } from "./local-test";
import type { PaymentProvider } from "./types";

export * from "./types";

function isLocalhost(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

let cached: PaymentProvider | null | undefined;

/**
 * Gateway configurado em PAYMENT_PROVIDER, ou null se não há nenhum.
 * Sem gateway, o checkout informa que o pagamento está indisponível; nenhuma
 * página é publicada sem confirmação real.
 *
 * Para integrar um gateway: crie um arquivo nesta pasta implementando
 * PaymentProvider (ver ./types.ts e docs/PAGAMENTOS.md) e acrescente um caso abaixo.
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (cached !== undefined) return cached;
  const { PAYMENT_PROVIDER, PAYMENT_WEBHOOK_SECRET, APP_URL } = env();

  switch (PAYMENT_PROVIDER) {
    case undefined:
      cached = null;
      break;
    case LOCAL_TEST_PROVIDER:
      // Trava de segurança: o gateway de testes jamais funciona fora de localhost.
      if (!isLocalhost(APP_URL) || !PAYMENT_WEBHOOK_SECRET) {
        console.error(
          `[pagamento] "${LOCAL_TEST_PROVIDER}" exige APP_URL em localhost e PAYMENT_WEBHOOK_SECRET. Pagamentos desabilitados.`,
        );
        cached = null;
      } else {
        cached = createLocalTestProvider(PAYMENT_WEBHOOK_SECRET);
      }
      break;
    default:
      console.error(`[pagamento] PAYMENT_PROVIDER desconhecido: "${PAYMENT_PROVIDER}".`);
      cached = null;
  }
  return cached;
}

/** Usado pelo webhook: só responde pelo gateway que está realmente ativo. */
export function getPaymentProviderByName(name: string): PaymentProvider | null {
  const provider = getPaymentProvider();
  return provider?.name === name ? provider : null;
}
