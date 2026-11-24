import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChristmasCard, ElfCharacter } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getPaymentProvider } from "@/integrations/payment";
import { getDashboard } from "@/modules/admin/queries";
import { formatBRL } from "@/modules/pricing/price";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <ChristmasCard as="li" tone={highlight ? "cream" : "white"} className="!p-5">
      <p className="font-display text-sm opacity-75">{label}</p>
      <p className={highlight ? "text-primary text-4xl font-black" : "text-3xl font-black"}>
        {value}
      </p>
    </ChristmasCard>
  );
}

async function Dashboard() {
  await requireAdmin();
  const stats = await getDashboard();
  const provider = getPaymentProvider();

  return (
    <div className="space-y-6">
      {!provider && (
        <ChristmasCard className="flex items-center gap-4 !p-5">
          <ElfCharacter pose="sad" size={64} animated={false} />
          <p>
            <strong>Nenhum gateway de pagamento configurado.</strong> O checkout está avisando os
            compradores que o pagamento está indisponível. Veja docs/PAGAMENTOS.md.
          </p>
        </ChristmasCard>
      )}
      {provider?.notice && (
        <ChristmasCard className="!p-5">
          <strong>Gateway de testes ativo ({provider.name}).</strong> As vendas abaixo não
          representam dinheiro recebido.
        </ChristmasCard>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Faturamento" value={formatBRL(stats.revenueCents)} highlight />
        <Stat label="Vendas" value={String(stats.sales)} highlight />
        <Stat label="Pagamentos aprovados" value={String(stats.approvedPayments)} />
        <Stat label="Pagamentos pendentes" value={String(stats.pendingPayments)} />
        <Stat label="Páginas criadas" value={String(stats.pages)} />
        <Stat label="Páginas publicadas" value={String(stats.published)} />
        <Stat label="Rascunhos" value={String(stats.drafts)} />
        <Stat label="Contas de clientes" value={String(stats.users)} />
      </ul>
    </div>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <AdminShell title="Resumo" current="/admin" searchParams={searchParams}>
      <Dashboard />
    </AdminShell>
  );
}
