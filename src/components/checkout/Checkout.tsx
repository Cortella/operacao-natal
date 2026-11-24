"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  ChristmasCard,
  ElfCharacter,
  ErrorMessage,
  FormInput,
  LoadingAnimation,
  PrimaryButton,
  SecondaryButton,
  SuccessMessage,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { checkPaymentAction, quoteAction, startCheckoutAction } from "@/modules/payments/actions";
import type { CheckoutPayment, Quote } from "@/modules/payments/service";
import { formatBRL } from "@/modules/pricing/price";

type Method = "PIX" | "CREDIT_CARD";

type Props = {
  pageId: string;
  recipientName: string;
  initialQuote: Quote;
  /** Formas de pagamento do gateway ativo; vazio quando não há gateway configurado. */
  methods: Method[];
  notice: string | null;
  initialPayment: CheckoutPayment | null;
  /** Imagem do QR code gerada no servidor para a cobrança inicial. */
  initialQrCode: string | null;
};

const METHOD_LABEL: Record<Method, { title: string; text: string }> = {
  PIX: { title: "PIX", text: "Aprovação em segundos" },
  CREDIT_CARD: { title: "Cartão de crédito", text: "Pagamento em ambiente seguro" },
};

const POLL_MS = 4000;

export function Checkout({
  pageId,
  recipientName,
  initialQuote,
  methods,
  notice,
  initialPayment,
  initialQrCode,
}: Props) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>(methods[0] ?? "PIX");
  const [payment, setPayment] = useState(initialPayment);
  const [qrCode, setQrCode] = useState(initialQrCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const waiting = payment?.status === "PENDING";
  const failed = payment && ["REJECTED", "CANCELED", "EXPIRED"].includes(payment.status);

  // Enquanto a cobrança está pendente, o servidor é consultado; é ele (e não esta
  // tela) que pergunta ao gateway e decide se a página foi liberada.
  useEffect(() => {
    if (!waiting) return;
    let active = true;
    const timer = setInterval(async () => {
      const result = await checkPaymentAction(pageId).catch(() => null);
      if (!active || !result?.ok) return;
      if (result.data.published) {
        router.push(`/checkout/${pageId}/sucesso`);
      } else if (result.data.status !== "PENDING" && result.data.status !== "NONE") {
        setPayment((current) =>
          current
            ? { ...current, status: result.data.status as CheckoutPayment["status"] }
            : current,
        );
      }
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [waiting, pageId, router]);

  async function applyCoupon() {
    setCouponMessage(null);
    setBusy(true);
    const result = await quoteAction(coupon).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      setCouponMessage(result?.error ?? "Não foi possível validar o cupom.");
      return;
    }
    setQuote(result.data);
    setAppliedCoupon(result.data.coupon?.code ?? "");
    setCouponMessage(result.data.couponError);
  }

  async function pay() {
    setError(null);
    setBusy(true);
    const result = await startCheckoutAction({
      pageId,
      method,
      couponCode: appliedCoupon || undefined,
    }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      setError(result?.error ?? "Sem conexão. Confira sua internet e tente de novo.");
      return;
    }
    if (result.data.redirectUrl) {
      window.location.assign(result.data.redirectUrl);
      return;
    }
    setPayment(result.data);
    setQrCode(result.data.pix?.qrCodeBase64 ?? null);
    if (result.data.status === "APPROVED") router.push(`/checkout/${pageId}/sucesso`);
  }

  async function copyCode() {
    if (!payment?.pix) return;
    try {
      await navigator.clipboard.writeText(payment.pix.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  const summary = (
    <ChristmasCard tone="white" className="!p-5">
      <h2 className="text-xl">Resumo</h2>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-4">
          <dt>Página de Natal para {recipientName}</dt>
          <dd className="font-bold">{formatBRL(quote.priceCents)}</dd>
        </div>
        {quote.discountCents > 0 && (
          <div className="text-elf-green flex justify-between gap-4">
            <dt>Cupom {quote.coupon?.code}</dt>
            <dd className="font-bold">− {formatBRL(quote.discountCents)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-black/10 pt-3">
          <dt className="font-display text-lg">Total</dt>
          <dd className="text-primary text-3xl font-black">{formatBRL(quote.totalCents)}</dd>
        </div>
      </dl>
    </ChristmasCard>
  );

  if (methods.length === 0) {
    return (
      <div className="space-y-5">
        {summary}
        <ErrorMessage compact title="Pagamento indisponível no momento">
          Sua página está salva. Volte em breve para concluir a compra.
        </ErrorMessage>
        <Button href={`/criar/${pageId}`} variant="outline">
          Voltar para a página
        </Button>
      </div>
    );
  }

  if (waiting && payment?.pix) {
    return (
      <div className="space-y-5">
        {notice && <ErrorMessage compact title={notice} />}
        <ChristmasCard tone="white" className="flex flex-col items-center text-center">
          <h2 className="text-primary text-2xl">Pague com PIX</h2>
          <p className="mt-1">
            Total: <strong>{formatBRL(payment.amountCents)}</strong>
          </p>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="QR code do PIX"
              width={220}
              height={220}
              className="mt-4 rounded-xl border-4 border-white shadow-md"
            />
          )}
          <ol className="mt-4 w-full max-w-sm list-decimal space-y-1 pl-5 text-left">
            <li>Abra o aplicativo do seu banco.</li>
            <li>Escolha pagar com PIX e leia o QR code, ou use o código abaixo.</li>
            <li>Confirme o pagamento. Esta tela atualiza sozinha.</li>
          </ol>
          <label htmlFor="pix-code" className="field-label mt-5 self-start">
            PIX copia e cola
          </label>
          <textarea
            id="pix-code"
            readOnly
            rows={3}
            value={payment.pix.code}
            onFocus={(event) => event.currentTarget.select()}
            className="field-control resize-none text-sm break-all"
          />
          <SecondaryButton fullWidth className="mt-3" onClick={copyCode}>
            {copied ? "Código copiado ✓" : "Copiar código"}
          </SecondaryButton>
        </ChristmasCard>
        <LoadingAnimation
          label="Aguardando a confirmação do pagamento…"
          className="text-text-light"
        />
        {error && <ErrorMessage compact title={error} />}
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="space-y-5">
        {summary}
        <LoadingAnimation
          label="Aguardando a confirmação do pagamento…"
          className="text-text-light"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <ErrorMessage compact title={notice} />}
      {failed && (
        <ErrorMessage compact title="O pagamento anterior não foi concluído">
          {payment?.statusDetail ?? "Você pode tentar de novo agora."}
        </ErrorMessage>
      )}
      {summary}

      <ChristmasCard tone="white" className="!p-5">
        <div className="flex items-end gap-3">
          <FormInput
            className="flex-1"
            label="Cupom de desconto"
            optional
            value={coupon}
            maxLength={40}
            autoCapitalize="characters"
            onChange={(event) => setCoupon(event.target.value.toUpperCase())}
            error={couponMessage ?? undefined}
          />
          <Button
            variant="outline"
            onClick={applyCoupon}
            disabled={busy || !coupon.trim()}
            className={cn(couponMessage && "mb-7")}
          >
            Aplicar
          </Button>
        </div>
        {quote.coupon && !couponMessage && (
          <SuccessMessage compact title={`Cupom ${quote.coupon.code} aplicado`} className="mt-3" />
        )}
      </ChristmasCard>

      <fieldset>
        <legend className="font-display text-text-light mb-2 text-lg">Como você quer pagar?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {methods.map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border-4 bg-white p-4 text-text-dark",
                method === option ? "border-gold" : "border-transparent",
              )}
            >
              <input
                type="radio"
                name="method"
                className="accent-elf-green h-5 w-5"
                checked={method === option}
                onChange={() => setMethod(option)}
              />
              <span>
                <span className="font-display block text-lg font-semibold">
                  {METHOD_LABEL[option].title}
                </span>
                <span className="text-sm opacity-75">{METHOD_LABEL[option].text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <ErrorMessage compact title={error} />}

      <PrimaryButton size="lg" fullWidth loading={busy} onClick={pay}>
        Pagar {formatBRL(quote.totalCents)}
      </PrimaryButton>
      <div className="text-text-light flex items-center justify-center gap-3 text-sm">
        <ElfCharacter pose="idle" size={44} animated={false} />
        <p>A página é publicada assim que o pagamento é confirmado.</p>
      </div>
    </div>
  );
}
