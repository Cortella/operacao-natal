import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShareBox } from "@/components/checkout/ShareBox";
import { AppShell } from "@/components/layout/AppShell";
import { Button, ChristmasCard, ElfCharacter, ErrorMessage, PrimaryButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getOwnedPage } from "@/modules/pages/queries";

export const metadata: Metadata = { title: "Presente pronto" };

async function Success({ params }: Pick<PageProps<"/checkout/[id]/sucesso">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/checkout/${id}/sucesso`);
  const page = await getOwnedPage(id, user.id);
  if (!page) notFound();

  // Chegar a este endereço não prova pagamento: só o status gravado pelo servidor
  // (depois da confirmação do gateway) libera o link.
  if (page.status === "DRAFT" || page.status === "PENDING_PAYMENT") {
    redirect(`/checkout/${id}`);
  }

  if (page.status === "DISABLED" || !page.slug) {
    return (
      <ErrorMessage
        title="Esta página está fora do ar"
        actions={<PrimaryButton href="/minhas-paginas">Ir para minhas páginas</PrimaryButton>}
      >
        Você pode colocá-la no ar de novo em “Minhas páginas”.
      </ErrorMessage>
    );
  }

  const url = `${env().APP_URL}/presente/${page.slug}`;
  const { expired } = page;

  return (
    <ChristmasCard stitched className="animate-pop flex flex-col items-center text-center">
      <ElfCharacter pose="cheer" size={130} />
      <h1 className="text-elf-green mt-2 text-3xl">Seu presente está pronto!</h1>
      <p className="mt-2 max-w-md">
        A página de {page.recipientName} já está no ar. Agora é só enviar o link.
      </p>
      {expired && (
        <ErrorMessage compact title="O prazo desta página terminou" className="mt-4">
          O link não abre mais para visitantes.
        </ErrorMessage>
      )}
      {page.expiresAt && !expired && (
        <p className="mt-2 text-sm opacity-75">
          Fica disponível até {page.expiresAt.toLocaleDateString("pt-BR")}.
        </p>
      )}
      <div className="mt-6 w-full">
        <ShareBox url={url} recipientName={page.recipientName} />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <PrimaryButton href={`/presente/${page.slug}`} target="_blank">
          Ver o presente
        </PrimaryButton>
        <Button href={`/criar/${id}`} variant="outline">
          Editar página
        </Button>
      </div>
    </ChristmasCard>
  );
}

export default function SuccessPage({ params }: PageProps<"/checkout/[id]/sucesso">) {
  return (
    <AppShell size="sm" footer={false}>
      <Success params={params} />
    </AppShell>
  );
}
