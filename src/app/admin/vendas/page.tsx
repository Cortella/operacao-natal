import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminShell,
  Pagination,
  TableScroll,
  firstParam,
  type AdminSearchParams,
} from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { METHOD_LABEL, ORDER_STATUS, PAYMENT_STATUS, formatDateTime } from "@/modules/admin/format";
import { listOrders } from "@/modules/admin/queries";
import { formatBRL } from "@/modules/pricing/price";

export const metadata: Metadata = { title: "Vendas", robots: { index: false, follow: false } };

async function Orders({ searchParams }: { searchParams: AdminSearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const result = await listOrders(Number(firstParam(params.pagina)) || 1);

  return (
    <div className="space-y-5">
      <p className="text-text-light">{result.total} pedido(s).</p>
      <TableScroll>
        <table className="table-noel">
          <thead>
            <tr>
              <th>Data</th>
              <th>Comprador</th>
              <th>Página</th>
              <th>Valor</th>
              <th>Pedido</th>
              <th>Cobranças no gateway</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap">
                  {formatDateTime(order.createdAt)}
                  {order.paidAt && (
                    <span className="block text-xs opacity-70">
                      Pago em {formatDateTime(order.paidAt)}
                    </span>
                  )}
                </td>
                <td>
                  {order.user.name}
                  <span className="block text-xs opacity-70">{order.user.email}</span>
                </td>
                <td>
                  {order.page ? (
                    <Link
                      href={`/admin/paginas/${order.page.id}`}
                      className="text-primary font-bold underline"
                    >
                      {order.page.title || "Sem título"}
                    </Link>
                  ) : (
                    <span className="opacity-70">Página excluída</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <strong>{formatBRL(order.totalCents)}</strong>
                  {order.discountCents > 0 && (
                    <span className="block text-xs opacity-70">
                      {formatBRL(order.priceCents)} − {formatBRL(order.discountCents)}
                      {order.coupon ? ` (${order.coupon.code})` : ""}
                    </span>
                  )}
                </td>
                <td>
                  <span className={ORDER_STATUS[order.status].className}>
                    {ORDER_STATUS[order.status].label}
                  </span>
                </td>
                <td>
                  {order.payments.length === 0 ? (
                    <span className="opacity-70">Nenhuma</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {order.payments.map((payment) => (
                        <li key={payment.id} className="text-xs">
                          <span className={PAYMENT_STATUS[payment.status].className}>
                            {PAYMENT_STATUS[payment.status].label}
                          </span>{" "}
                          {METHOD_LABEL[payment.method]} · {formatBRL(payment.amountCents)} ·{" "}
                          {payment.provider}
                          <span className="block break-all opacity-70">
                            {payment.providerPaymentId}
                            {payment.statusDetail ? ` · ${payment.statusDetail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
      <Pagination
        page={result.page}
        pages={result.pages}
        hrefFor={(page) => (page > 1 ? `/admin/vendas?pagina=${page}` : "/admin/vendas")}
      />
    </div>
  );
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/vendas">) {
  return (
    <AdminShell title="Vendas e transações" current="/admin/vendas" searchParams={searchParams}>
      <Orders searchParams={searchParams} />
    </AdminShell>
  );
}
