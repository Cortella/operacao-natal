/* Capas vêm do storage dos usuários. */
/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import {
  Button,
  ChristmasCard,
  ElfCharacter,
  GiftBox,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createPageAction } from "@/modules/pages/actions";
import { listUserPages, type PageSummary } from "@/modules/pages/queries";

export const metadata: Metadata = { title: "Minhas páginas" };

function statusOf(page: PageSummary): { label: string; className: string } {
  if (page.status === "PUBLISHED" && page.expired) {
    return { label: "Expirada", className: "bg-cream-dark text-text-dark" };
  }
  return {
    DRAFT: { label: "Rascunho", className: "bg-gold text-text-dark" },
    PENDING_PAYMENT: { label: "Aguardando pagamento", className: "bg-gold text-text-dark" },
    PUBLISHED: { label: "No ar", className: "bg-elf-green text-white" },
    DISABLED: { label: "Fora do ar", className: "bg-cream-dark text-text-dark" },
  }[page.status];
}

async function PageList() {
  const user = await requireUser("/minhas-paginas");
  const pages = await listUserPages(user.id);
  const firstName = user.name.split(" ")[0];

  if (pages.length === 0) {
    return (
      <ChristmasCard className="mx-auto flex max-w-xl flex-col items-center text-center">
        <ElfCharacter pose="gift" size={120} />
        <h1 className="text-primary mt-2 text-3xl">Olá, {firstName}!</h1>
        <p className="mt-2 max-w-md">
          Você ainda não criou nenhuma página. Que tal preparar um presente agora?
        </p>
        <PrimaryButton href="/criar" size="lg" className="mt-6">
          Criar minha página de Natal
        </PrimaryButton>
      </ChristmasCard>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Olá, {firstName}!</h1>
        <form action={createPageAction}>
          <PrimaryButton type="submit">Criar outra página</PrimaryButton>
        </form>
      </div>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const status = statusOf(page);
          const live = page.status === "PUBLISHED" && !page.expired && page.slug;
          return (
            <ChristmasCard key={page.id} as="li" className="flex flex-col !p-4">
              <div className="bg-wood-light relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl">
                {page.cover ? (
                  <img src={page.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <GiftBox size={72} />
                )}
                <span
                  className={`font-display absolute top-2 left-2 rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              <h2 className="mt-3 text-xl break-words">{page.title || "Página sem título"}</h2>
              <p className="opacity-80">
                {page.recipientName ? `Para ${page.recipientName}` : "Ainda sem destinatário"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href={`/criar/${page.id}`} variant="outline" size="sm">
                  {page.status === "DRAFT" ? "Continuar" : "Editar"}
                </Button>
                {live && (
                  <SecondaryButton href={`/presente/${page.slug}`} size="sm" target="_blank">
                    Abrir
                  </SecondaryButton>
                )}
                {page.status === "PENDING_PAYMENT" && (
                  <PrimaryButton href={`/checkout/${page.id}`} size="sm">
                    Pagar
                  </PrimaryButton>
                )}
              </div>
            </ChristmasCard>
          );
        })}
      </ul>
    </>
  );
}

export default function MyPagesPage() {
  return (
    <AppShell>
      <PageList />
    </AppShell>
  );
}
