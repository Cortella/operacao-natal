import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  InvalidWebhookError,
  type ChargeInput,
  type ChargeResult,
  type PaymentProvider,
  type PaymentStatus,
  type ProviderPayment,
  type WebhookEvent,
  type WebhookRequest,
} from "./types";

export const LOCAL_TEST_PROVIDER = "teste-local";
export const LOCAL_TEST_SIGNATURE_HEADER = "x-assinatura";

const webhookSchema = z.object({
  id: z.string().min(8).max(100),
  paymentId: z.string().min(8).max(100),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELED", "REFUNDED", "EXPIRED"]),
  amountCents: z.number().int().positive(),
});

export function signLocalWebhook(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Gateway de testes que roda só na máquina do desenvolvedor.
 *
 * NÃO cobra ninguém. Serve para exercitar o fluxo real da aplicação (pedido,
 * webhook assinado, idempotência, publicação) sem depender de um gateway externo.
 * O "pagamento" só muda de estado quando chega um webhook assinado com
 * PAYMENT_WEBHOOK_SECRET (ver scripts/pagamento-teste.mjs e os testes e2e).
 * O registro em ./index.ts só o habilita quando APP_URL aponta para localhost.
 */
export function createLocalTestProvider(secret: string): PaymentProvider {
  return {
    name: LOCAL_TEST_PROVIDER,
    methods: ["PIX"],
    notice:
      "Ambiente de testes local: nenhuma cobrança real é feita e o código PIX abaixo não funciona em bancos.",

    async createCharge(input: ChargeInput): Promise<ChargeResult> {
      const providerPaymentId = `teste_${randomBytes(12).toString("hex")}`;
      return {
        providerPaymentId,
        status: "PENDING",
        pix: {
          code: `PIX-DE-TESTE-NAO-PAGAVEL-${providerPaymentId}-${input.amountCents}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      };
    },

    // O "estado no gateway" é a última notificação assinada recebida para a cobrança.
    async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
      const events = await db.paymentEvent.findMany({
        where: {
          provider: LOCAL_TEST_PROVIDER,
          payload: { path: ["paymentId"], equals: providerPaymentId },
        },
        orderBy: { receivedAt: "desc" },
        take: 1,
        select: { payload: true },
      });
      const parsed = webhookSchema.safeParse(events[0]?.payload);
      if (!parsed.success) {
        const payment = await db.payment.findFirst({
          where: { provider: LOCAL_TEST_PROVIDER, providerPaymentId },
          select: { amountCents: true },
        });
        return { status: "PENDING", amountCents: payment?.amountCents ?? 0 };
      }
      return { status: parsed.data.status as PaymentStatus, amountCents: parsed.data.amountCents };
    },

    async parseWebhook({ headers, rawBody }: WebhookRequest): Promise<WebhookEvent> {
      const received = headers.get(LOCAL_TEST_SIGNATURE_HEADER) ?? "";
      const expected = signLocalWebhook(rawBody, secret);
      const a = Buffer.from(received, "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new InvalidWebhookError("Assinatura inválida.");
      }

      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new InvalidWebhookError("Corpo inválido.");
      }
      const parsed = webhookSchema.safeParse(json);
      if (!parsed.success) throw new InvalidWebhookError("Formato inesperado.");

      return {
        eventKey: parsed.data.id,
        type: `payment.${parsed.data.status.toLowerCase()}`,
        providerPaymentId: parsed.data.paymentId,
        payload: parsed.data,
      };
    },
  };
}
