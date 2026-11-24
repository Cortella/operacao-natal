"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { getPaymentProvider, type PaymentStatus } from "@/integrations/payment";
import {
  CheckoutError,
  latestPayment,
  quoteOrder,
  startCheckout,
  syncPayment,
  type CheckoutPayment,
  type Quote,
} from "./service";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const SESSION_EXPIRED = "Sua sessão expirou. Entre de novo para continuar.";

const startSchema = z.object({
  pageId: z.string().min(1).max(64),
  method: z.enum(["PIX", "CREDIT_CARD"]),
  couponCode: z.string().max(40).optional(),
});

/** Prévia do valor com cupom. O valor cobrado é recalculado ao gerar a cobrança. */
export async function quoteAction(couponCode: string): Promise<Result<Quote>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  const limit = await rateLimit(`cupom:${user.id}`, 20, 10 * 60);
  if (!limit.allowed) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };
  return { ok: true, data: await quoteOrder(String(couponCode ?? "")) };
}

export async function startCheckoutAction(input: unknown): Promise<Result<CheckoutPayment>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido. Recarregue a página." };

  const limit = await rateLimit(`checkout:${user.id}`, 15, 10 * 60);
  if (!limit.allowed) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };

  try {
    return { ok: true, data: await startCheckout({ user, ...parsed.data }) };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, error: error.message };
    throw error;
  }
}

export type PaymentCheck = {
  status: PaymentStatus | "NONE";
  statusDetail: string | null;
  /** Preenchido quando a página já está no ar. */
  published: boolean;
};

/**
 * Consulta o status do pagamento da página. Não confia no banco local: pergunta
 * ao gateway de novo, o que também cobre o caso de um webhook que não chegou.
 */
export async function checkPaymentAction(pageId: string): Promise<Result<PaymentCheck>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  const id = z.string().min(1).max(64).safeParse(pageId);
  if (!id.success) return { ok: false, error: "Pedido inválido." };

  const limit = await rateLimit(`status:${user.id}`, 120, 10 * 60);
  if (!limit.allowed) return { ok: false, error: retryMessage(limit.retryAfterSeconds) };

  const page = await db.giftPage.findFirst({
    where: { id: id.data, ownerId: user.id },
    select: { status: true },
  });
  if (!page) return { ok: false, error: "Não encontramos esta página na sua conta." };
  if (page.status === "PUBLISHED") {
    return { ok: true, data: { status: "APPROVED", statusDetail: null, published: true } };
  }

  const latest = await latestPayment(id.data, user.id);
  if (!latest) return { ok: true, data: { status: "NONE", statusDetail: null, published: false } };

  const provider = getPaymentProvider();
  if (!provider || provider.name !== latest.provider) {
    const { status, statusDetail } = latest.view;
    return { ok: true, data: { status, statusDetail, published: false } };
  }

  try {
    const synced = await syncPayment(provider, latest.providerPaymentId);
    return {
      ok: true,
      data: {
        status: synced?.status ?? latest.view.status,
        statusDetail: latest.view.statusDetail,
        published: synced?.published ?? false,
      },
    };
  } catch (error) {
    console.error("[pagamento] Falha ao consultar o gateway.", error);
    return { ok: false, error: "Não conseguimos consultar o pagamento agora." };
  }
}
