import type { Metadata } from "next";
import { AdminShell, TableScroll } from "@/components/admin/AdminShell";
import { Button, ChristmasCard, FormInput, FormSelect, PrimaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminCreateCoupon, adminDeleteCoupon, adminToggleCoupon } from "@/modules/admin/actions";
import { formatDateTime } from "@/modules/admin/format";
import { listCoupons } from "@/modules/admin/queries";
import { formatBRL } from "@/modules/pricing/price";

export const metadata: Metadata = { title: "Cupons", robots: { index: false, follow: false } };

async function Coupons() {
  await requireAdmin();
  const coupons = await listCoupons();

  return (
    <div className="space-y-6">
      <ChristmasCard>
        <h2 className="text-primary text-2xl">Novo cupom</h2>
        <form action={adminCreateCoupon} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            label="Código"
            name="code"
            required
            maxLength={40}
            autoCapitalize="characters"
            placeholder="NATAL10"
          />
          <FormSelect label="Tipo de desconto" name="type" defaultValue="PERCENT">
            <option value="PERCENT">Percentual (%)</option>
            <option value="FIXED">Valor fixo (R$)</option>
          </FormSelect>
          <FormInput
            label="Valor"
            name="value"
            required
            inputMode="decimal"
            placeholder="10"
            hint="Percentual de 1 a 100, ou valor em reais."
          />
          <FormInput
            label="Limite de usos"
            name="maxRedemptions"
            type="number"
            min={1}
            optional
            hint="Vazio = sem limite."
          />
          <FormInput label="Válido a partir de" name="startsAt" type="datetime-local" optional />
          <FormInput label="Válido até" name="endsAt" type="datetime-local" optional />
          <div className="sm:col-span-2 lg:col-span-3">
            <PrimaryButton type="submit">Criar cupom</PrimaryButton>
          </div>
        </form>
      </ChristmasCard>

      <TableScroll>
        <table className="table-noel">
          <thead>
            <tr>
              <th>Código</th>
              <th>Desconto</th>
              <th>Usos</th>
              <th>Validade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className="font-bold">{coupon.code}</td>
                <td>{coupon.type === "PERCENT" ? `${coupon.value}%` : formatBRL(coupon.value)}</td>
                <td>
                  {coupon.redemptions}
                  {coupon.maxRedemptions !== null ? ` de ${coupon.maxRedemptions}` : ""}
                </td>
                <td className="text-xs whitespace-nowrap">
                  De: {formatDateTime(coupon.startsAt)}
                  <br />
                  Até: {formatDateTime(coupon.endsAt)}
                </td>
                <td>
                  <span className={coupon.active ? "badge badge-green" : "badge"}>
                    {coupon.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <form action={adminToggleCoupon}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <input type="hidden" name="active" value={coupon.active ? "0" : "1"} />
                      <Button type="submit" variant="outline" size="sm">
                        {coupon.active ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                    <form action={adminDeleteCoupon}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        aria-label={`Excluir cupom ${coupon.code}`}
                      >
                        Excluir
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  Nenhum cupom cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

export default function AdminCouponsPage({ searchParams }: PageProps<"/admin/cupons">) {
  return (
    <AdminShell title="Cupons de desconto" current="/admin/cupons" searchParams={searchParams}>
      <Coupons />
    </AdminShell>
  );
}
