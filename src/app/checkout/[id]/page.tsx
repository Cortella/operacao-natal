import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/checkout/Checkout";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ErrorMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/integrations/payment";
import { getOwnedPage } from "@/modules/pages/queries";
import { missingForCheckout } from "@/modules/pages/schema";
import { latestPayment, quoteOrder, withQrCode } from "@/modules/payments/service";

export const metadata: Metadata = { title: "Pagamento" };

async function CheckoutLoader({ params }: Pick<PageProps<"/checkout/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/checkout/${id}`);
  const page = await getOwnedPage(id, user.id);
  if (!page) notFound();
  if (page.status === "PUBLISHED" || page.status === "DISABLED") {
    redirect(`/checkout/${id}/sucesso`);
  }

  const missing = missingForCheckout(page);
  if (missing.length > 0) {
    return (
      <div className="space-y-4">
        <ErrorMessage compact title="Sua página ainda não está completa">
          Falta preencher: {missing.map((item) => item.label).join(", ")}.
        </ErrorMessage>
        <Button href={`/criar/${id}`} variant="outline">
          Voltar ao editor
        </Button>
      </div>
    );
  }

  const provider = getPaymentProvider();
  const [quote, latest] = await Promise.all([quoteOrder(), latestPayment(id, user.id)]);
  // Só retoma a cobrança se ela é do gateway ativo e ainda aguarda pagamento.
  const resumable =
    latest && provider?.name === latest.provider && latest.view.status === "PENDING"
      ? await withQrCode(latest.view)
      : null;

  return (
    <Checkout
      pageId={id}
      recipientName={page.recipientName}
      initialQuote={quote}
      methods={provider ? [...provider.methods] : []}
      notice={provider?.notice ?? null}
      initialPayment={resumable ?? latest?.view ?? null}
      initialQrCode={resumable?.pix?.qrCodeBase64 ?? null}
    />
  );
}

export default function CheckoutPage({ params }: PageProps<"/checkout/[id]">) {
  return (
    <AppShell size="sm" footer={false}>
      <h1 className="mb-6 text-center text-3xl">Finalizar presente</h1>
      <CheckoutLoader params={params} />
    </AppShell>
  );
}
