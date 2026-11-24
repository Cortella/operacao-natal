import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ChristmasCard, FormInput, PrimaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminSavePageRules, adminSavePricing } from "@/modules/admin/actions";
import { centsToInput, toLocalInput } from "@/modules/admin/format";
import { getCurrentPrice } from "@/modules/pricing/offer";
import { formatBRL } from "@/modules/pricing/price";
import { getSettings } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Preço", robots: { index: false, follow: false } };

async function Commercial() {
  await requireAdmin();
  const [{ pricing, pages }, current] = await Promise.all([getSettings(), getCurrentPrice()]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChristmasCard>
        <h2 className="text-primary text-2xl">Preço e promoção</h2>
        <p className="mt-1">
          Valor cobrado agora: <strong>{formatBRL(current.priceCents)}</strong>
          {current.promoActive ? " (promoção ativa)" : ""}
        </p>
        <form action={adminSavePricing} className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Preço normal (R$)"
            name="price"
            inputMode="decimal"
            required
            defaultValue={centsToInput(pricing.priceCents)}
          />
          <FormInput
            label="Preço promocional (R$)"
            name="promoPrice"
            inputMode="decimal"
            optional
            defaultValue={centsToInput(pricing.promoPriceCents)}
            hint="Vazio = sem promoção."
          />
          <FormInput
            className="sm:col-span-2"
            label="Texto da faixa de promoção"
            name="promoLabel"
            maxLength={120}
            defaultValue={pricing.promoLabel}
          />
          <FormInput
            className="sm:col-span-2"
            label="Promoção válida até"
            name="promoEndsAt"
            type="datetime-local"
            optional
            defaultValue={toLocalInput(pricing.promoEndsAt)}
            hint="Horário de Brasília. Vazio = sem prazo. A landing mostra a contagem regressiva."
          />
          <div className="sm:col-span-2">
            <PrimaryButton type="submit">Salvar preço</PrimaryButton>
          </div>
        </form>
      </ChristmasCard>

      <ChristmasCard>
        <h2 className="text-primary text-2xl">Regras das páginas</h2>
        <form action={adminSavePageRules} className="mt-4 grid gap-4">
          <FormInput
            label="Validade das páginas (dias)"
            name="expirationDays"
            type="number"
            min={1}
            max={3650}
            optional
            defaultValue={pages.expirationDays ?? ""}
            hint="Contada a partir da publicação. Vazio = não expira. Vale para as próximas publicações."
          />
          <FormInput
            label="Máximo de fotos por página"
            name="maxPhotos"
            type="number"
            min={1}
            max={30}
            required
            defaultValue={pages.maxPhotos}
          />
          <div>
            <PrimaryButton type="submit">Salvar regras</PrimaryButton>
          </div>
        </form>
      </ChristmasCard>
    </div>
  );
}

export default function AdminCommercialPage({ searchParams }: PageProps<"/admin/comercial">) {
  return (
    <AdminShell title="Preço e promoções" current="/admin/comercial" searchParams={searchParams}>
      <Commercial />
    </AdminShell>
  );
}
