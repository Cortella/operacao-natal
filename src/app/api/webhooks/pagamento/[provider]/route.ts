import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { InvalidWebhookError, getPaymentProviderByName } from "@/integrations/payment";
import { syncPayment } from "@/modules/payments/service";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Notificações do gateway de pagamento.
 *
 * 1. A assinatura é validada antes de qualquer outra coisa.
 * 2. Cada notificação é gravada uma única vez (idempotência por eventKey).
 * 3. O conteúdo da notificação não é usado como verdade: o pagamento é
 *    consultado de novo no gateway antes de liberar a página.
 * Em caso de falha interna respondemos 500, para o gateway tentar de novo.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/webhooks/pagamento/[provider]">,
) {
  const { provider: name } = await context.params;
  const provider = getPaymentProviderByName(name);
  if (!provider) return NextResponse.json({ error: "Gateway desconhecido." }, { status: 404 });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Corpo grande demais." }, { status: 413 });
  }

  let event;
  try {
    event = await provider.parseWebhook({
      headers: request.headers,
      rawBody,
      url: new URL(request.url),
    });
  } catch (error) {
    if (error instanceof InvalidWebhookError) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
    throw error;
  }

  const where = { provider_eventKey: { provider: provider.name, eventKey: event.eventKey } };
  let record = await db.paymentEvent.findUnique({ where, select: { id: true, processedAt: true } });
  if (!record) {
    try {
      record = await db.paymentEvent.create({
        data: {
          provider: provider.name,
          eventKey: event.eventKey,
          type: event.type,
          payload: (event.payload ?? {}) as object,
        },
        select: { id: true, processedAt: true },
      });
    } catch (error) {
      // Duas entregas simultâneas da mesma notificação: fica valendo a que gravou primeiro.
      if ((error as { code?: string }).code !== "P2002") throw error;
      record = await db.paymentEvent.findUnique({ where, select: { id: true, processedAt: true } });
    }
  }
  if (!record) return NextResponse.json({ error: "Tente de novo." }, { status: 500 });
  if (record.processedAt) return NextResponse.json({ ok: true, duplicate: true });

  const result = event.providerPaymentId
    ? await syncPayment(provider, event.providerPaymentId)
    : null;

  await db.paymentEvent.update({
    where: { id: record.id },
    data: {
      processedAt: new Date(),
      paymentId: result?.paymentId ?? null,
      status: result?.status ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
