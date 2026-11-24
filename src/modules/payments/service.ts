import "server-only";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  PaymentProviderError,
  getPaymentProvider,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentStatus,
} from "@/integrations/payment";
import { getOwnedPage } from "@/modules/pages/queries";
import { baseSlug, missingForCheckout } from "@/modules/pages/schema";
import { getCurrentPrice } from "@/modules/pricing/offer";
import { checkCoupon } from "@/modules/pricing/price";
import { getSettings } from "@/modules/settings/service";

export type Quote = {
  priceCents: number;
  discountCents: number;
  totalCents: number;
  coupon: { id: string; code: string } | null;
  /** Motivo de um cupom informado não ter sido aplicado. */
  couponError: string | null;
};

export const normalizeCoupon = (code: string | null | undefined) =>
  (code ?? "").trim().toUpperCase().slice(0, 40);

/** Valor a cobrar agora, sempre calculado no servidor. */
export async function quoteOrder(couponCode?: string | null): Promise<Quote> {
  const { priceCents } = await getCurrentPrice();
  const quote: Quote = {
    priceCents,
    discountCents: 0,
    totalCents: priceCents,
    coupon: null,
    couponError: null,
  };

  const code = normalizeCoupon(couponCode);
  if (!code) return quote;

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return { ...quote, couponError: "Cupom não encontrado." };
  const check = checkCoupon(coupon, priceCents);
  if (!check.valid) return { ...quote, couponError: check.reason };

  return {
    ...quote,
    discountCents: check.discountCents,
    totalCents: priceCents - check.discountCents,
    coupon: { id: coupon.id, code: coupon.code },
  };
}

export type CheckoutPayment = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  statusDetail: string | null;
  amountCents: number;
  pix: { code: string; qrCodeBase64: string | null; expiresAt: string | null } | null;
  redirectUrl: string | null;
};

type PaymentRow = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  statusDetail: string | null;
  amountCents: number;
  pixCode: string | null;
  pixQrCodeBase64: string | null;
  pixExpiresAt: Date | null;
};

const toCheckoutPayment = (
  row: PaymentRow,
  redirectUrl: string | null = null,
): CheckoutPayment => ({
  id: row.id,
  method: row.method,
  status: row.status,
  statusDetail: row.statusDetail,
  amountCents: row.amountCents,
  pix: row.pixCode
    ? {
        code: row.pixCode,
        qrCodeBase64: row.pixQrCodeBase64,
        expiresAt: row.pixExpiresAt?.toISOString() ?? null,
      }
    : null,
  redirectUrl,
});

/**
 * Garante a imagem do QR code. Quando o gateway só devolve o código copia-e-cola,
 * a imagem é gerada aqui; `qrCodeBase64` sai sempre como data URL pronta para <img>.
 */
export async function withQrCode(payment: CheckoutPayment): Promise<CheckoutPayment> {
  if (!payment.pix) return payment;
  const given = payment.pix.qrCodeBase64;
  const qrCodeBase64 = given
    ? given.startsWith("data:")
      ? given
      : `data:image/png;base64,${given}`
    : await QRCode.toDataURL(payment.pix.code, { margin: 1, width: 440 });
  return { ...payment, pix: { ...payment.pix, qrCodeBase64 } };
}

const paymentSelect = {
  id: true,
  method: true,
  status: true,
  statusDetail: true,
  amountCents: true,
  pixCode: true,
  pixQrCodeBase64: true,
  pixExpiresAt: true,
} as const;

export class CheckoutError extends Error {}

/**
 * Cria (ou reaproveita) o pedido da página e gera a cobrança no gateway.
 * Nada aqui publica a página: isso só acontece em syncPayment, depois que o
 * gateway confirma o pagamento.
 */
export async function startCheckout(input: {
  user: { id: string; name: string; email: string };
  pageId: string;
  method: PaymentMethod;
  couponCode?: string | null;
}): Promise<CheckoutPayment> {
  const provider = getPaymentProvider();
  if (!provider) throw new CheckoutError("O pagamento está indisponível no momento.");
  if (!provider.methods.includes(input.method)) {
    throw new CheckoutError("Esta forma de pagamento não está disponível.");
  }

  const page = await getOwnedPage(input.pageId, input.user.id);
  if (!page) throw new CheckoutError("Não encontramos esta página na sua conta.");
  if (page.status === "PUBLISHED" || page.status === "DISABLED") {
    throw new CheckoutError("Esta página já foi paga.");
  }
  if (missingForCheckout(page).length > 0) {
    throw new CheckoutError("Complete sua página antes de pagar.");
  }

  const quote = await quoteOrder(input.couponCode);
  if (quote.couponError) throw new CheckoutError(quote.couponError);

  const amounts = {
    priceCents: quote.priceCents,
    discountCents: quote.discountCents,
    totalCents: quote.totalCents,
    couponId: quote.coupon?.id ?? null,
  };
  const pending = await db.order.findFirst({
    where: { pageId: page.id, userId: input.user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const order = pending
    ? await db.order.update({ where: { id: pending.id }, data: amounts, select: { id: true } })
    : await db.order.create({
        data: { ...amounts, userId: input.user.id, pageId: page.id },
        select: { id: true },
      });

  // Uma cobrança ainda válida, do mesmo valor e método, é reaproveitada em vez de
  // gerar outra a cada visita ao checkout.
  const reusable = await db.payment.findFirst({
    where: {
      orderId: order.id,
      provider: provider.name,
      method: input.method,
      status: "PENDING",
      amountCents: quote.totalCents,
      pixCode: { not: null },
      OR: [{ pixExpiresAt: null }, { pixExpiresAt: { gt: new Date(Date.now() + 60_000) } }],
    },
    orderBy: { createdAt: "desc" },
    select: paymentSelect,
  });
  if (reusable) return withQrCode(toCheckoutPayment(reusable));

  const appUrl = env().APP_URL;
  let charge;
  try {
    charge = await provider.createCharge({
      orderId: order.id,
      amountCents: quote.totalCents,
      description: `Página de Natal para ${page.recipientName}`,
      method: input.method,
      payer: { name: input.user.name, email: input.user.email },
      notificationUrl: `${appUrl}/api/webhooks/pagamento/${provider.name}`,
      returnUrl: `${appUrl}/checkout/${page.id}`,
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) throw new CheckoutError(error.message);
    console.error("[pagamento] Falha ao criar cobrança.", error);
    throw new CheckoutError("Não foi possível gerar a cobrança. Tente de novo em instantes.");
  }

  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      provider: provider.name,
      providerPaymentId: charge.providerPaymentId,
      method: input.method,
      // O status inicial nunca é "aprovado": a confirmação vem de syncPayment.
      status: charge.status === "APPROVED" ? "PENDING" : charge.status,
      statusDetail: charge.statusDetail ?? null,
      amountCents: quote.totalCents,
      pixCode: charge.pix?.code ?? null,
      pixQrCodeBase64: charge.pix?.qrCodeBase64 ?? null,
      pixExpiresAt: charge.pix?.expiresAt ?? null,
    },
    select: paymentSelect,
  });
  await db.giftPage.updateMany({
    where: { id: page.id, status: "DRAFT" },
    data: { status: "PENDING_PAYMENT" },
  });

  if (charge.status === "APPROVED") {
    await syncPayment(provider, charge.providerPaymentId);
    const fresh = await db.payment.findUnique({ where: { id: payment.id }, select: paymentSelect });
    if (fresh) return toCheckoutPayment(fresh, charge.redirectUrl ?? null);
  }
  return withQrCode(toCheckoutPayment(payment, charge.redirectUrl ?? null));
}

export type SyncResult = {
  paymentId: string;
  status: PaymentStatus;
  /** A página foi (ou já estava) publicada por causa deste pagamento. */
  published: boolean;
};

/**
 * Fonte única da verdade sobre um pagamento: consulta o gateway e aplica o
 * resultado. É chamada pelo webhook e pela consulta de status, e pode rodar
 * várias vezes para a mesma cobrança sem efeito duplicado.
 */
export async function syncPayment(
  provider: PaymentProvider,
  providerPaymentId: string,
): Promise<SyncResult | null> {
  const payment = await db.payment.findUnique({
    where: { provider_providerPaymentId: { provider: provider.name, providerPaymentId } },
    select: {
      id: true,
      status: true,
      amountCents: true,
      order: { select: { id: true, status: true, totalCents: true, pageId: true, couponId: true } },
    },
  });
  if (!payment) return null;

  const remote = await provider.getPayment(providerPaymentId);
  const { order } = payment;

  if (remote.status === "APPROVED") {
    // Confere o valor: uma cobrança paga com valor diferente do pedido não libera nada.
    if (remote.amountCents !== payment.amountCents || payment.amountCents !== order.totalCents) {
      console.error(
        `[pagamento] Valor divergente na cobrança ${providerPaymentId}: gateway ${remote.amountCents}, cobrança ${payment.amountCents}, pedido ${order.totalCents}.`,
      );
      await db.payment.update({
        where: { id: payment.id },
        data: { statusDetail: "Valor pago diferente do pedido; aguardando conferência." },
      });
      return { paymentId: payment.id, status: payment.status, published: false };
    }

    const published = await withRetry(() =>
      db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "APPROVED",
            statusDetail: remote.statusDetail ?? null,
            approvedAt: new Date(),
          },
        });
        // Só a primeira confirmação muda o pedido; as seguintes não repetem efeitos.
        const paid = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "PAID", paidAt: new Date() },
        });
        if (paid.count === 1 && order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { redemptions: { increment: 1 } },
          });
        }
        return order.pageId ? publishPage(tx, order.pageId) : false;
      }),
    );
    return { paymentId: payment.id, status: "APPROVED", published };
  }

  if (remote.status === "REFUNDED" && order.status === "PAID") {
    await db.$transaction([
      db.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } }),
      db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } }),
      ...(order.pageId
        ? [
            db.giftPage.updateMany({
              where: { id: order.pageId, status: "PUBLISHED" },
              data: { status: "DISABLED" },
            }),
          ]
        : []),
    ]);
    return { paymentId: payment.id, status: "REFUNDED", published: false };
  }

  // Um pagamento já aprovado não volta atrás por uma notificação atrasada.
  if (payment.status !== "APPROVED" && payment.status !== remote.status) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: remote.status, statusDetail: remote.statusDetail ?? null },
    });
  }
  return {
    paymentId: payment.id,
    status: payment.status === "APPROVED" ? "APPROVED" : remote.status,
    published: false,
  };
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Publica a página paga: define o endereço público e a validade. */
async function publishPage(tx: Tx, pageId: string): Promise<boolean> {
  const page = await tx.giftPage.findUnique({
    where: { id: pageId },
    select: { status: true, slug: true, senderName: true, recipientName: true },
  });
  if (!page) return false;
  if (page.status === "PUBLISHED") return true;
  // Página desativada depois de paga continua fora do ar até alguém reativar.
  if (page.status === "DISABLED") return false;

  const { pages } = await getSettings();
  const slug = page.slug ?? (await freeSlug(tx, baseSlug(page.senderName, page.recipientName)));
  await tx.giftPage.update({
    where: { id: pageId },
    data: {
      status: "PUBLISHED",
      slug,
      publishedAt: new Date(),
      expiresAt: pages.expirationDays
        ? new Date(Date.now() + pages.expirationDays * 24 * 60 * 60 * 1000)
        : null,
    },
  });
  return true;
}

/** "joao-e-maria"; se já existir, "joao-e-maria-2", "-3"… e por fim um sufixo aleatório. */
async function freeSlug(tx: Tx, base: string): Promise<string> {
  for (let attempt = 1; attempt <= 8; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const taken = await tx.giftPage.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/** Repete a transação quando duas publicações disputam o mesmo endereço. */
async function withRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= attempts || (code !== "P2002" && code !== "P2034")) throw error;
    }
  }
}

/** Cobrança mais recente da página, para o checkout retomar de onde parou. */
export async function latestPayment(pageId: string, userId: string) {
  const payment = await db.payment.findFirst({
    where: { order: { pageId, userId } },
    orderBy: { createdAt: "desc" },
    select: { ...paymentSelect, provider: true, providerPaymentId: true },
  });
  if (!payment) return null;
  const { provider, providerPaymentId, ...row } = payment;
  return { provider, providerPaymentId, view: toCheckoutPayment(row) };
}
