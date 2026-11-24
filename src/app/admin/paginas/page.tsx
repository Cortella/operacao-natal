import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminShell,
  Pagination,
  TableScroll,
  firstParam,
  type AdminSearchParams,
} from "@/components/admin/AdminShell";
import { Button, ChristmasCard, FormInput, FormSelect, PrimaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminSetPageBlocked } from "@/modules/admin/actions";
import { PAGE_STATUS, formatDateTime } from "@/modules/admin/format";
import { listPages, parsePageStatus } from "@/modules/admin/queries";

export const metadata: Metadata = { title: "Páginas", robots: { index: false, follow: false } };

async function Pages({ searchParams }: { searchParams: AdminSearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const status = parsePageStatus(firstParam(params.status));
  const result = await listPages({ q, status, page: Number(firstParam(params.pagina)) || 1 });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(query);
    if (page > 1) next.set("pagina", String(page));
    const text = next.toString();
    return text ? `/admin/paginas?${text}` : "/admin/paginas";
  };
  const here = hrefFor(result.page);

  return (
    <div className="space-y-5">
      <ChristmasCard className="!p-5">
        <form method="get" className="grid items-end gap-4 sm:grid-cols-[1fr_220px_auto]">
          <FormInput
            label="Buscar"
            name="q"
            defaultValue={q}
            placeholder="Título, comprador, destinatário, e-mail ou endereço"
          />
          <FormSelect label="Status" name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(PAGE_STATUS).map(([value, badge]) => (
              <option key={value} value={value}>
                {badge.label}
              </option>
            ))}
          </FormSelect>
          <PrimaryButton type="submit">Buscar</PrimaryButton>
        </form>
      </ChristmasCard>

      <p className="text-text-light">{result.total} página(s) encontrada(s).</p>

      <TableScroll>
        <table className="table-noel">
          <thead>
            <tr>
              <th>Página</th>
              <th>Comprador</th>
              <th>Destinatário</th>
              <th>Status</th>
              <th>Atualizada</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((page) => (
              <tr key={page.id}>
                <td>
                  <Link
                    href={`/admin/paginas/${page.id}`}
                    className="text-primary font-bold underline"
                  >
                    {page.title || "Sem título"}
                  </Link>
                  <span className="block text-xs opacity-70">
                    {page.slug ? `/presente/${page.slug}` : "sem endereço"} · {page._count.photos}{" "}
                    foto(s)
                  </span>
                </td>
                <td>
                  {page.owner.name}
                  <span className="block text-xs opacity-70">{page.owner.email}</span>
                </td>
                <td>{page.recipientName || "—"}</td>
                <td>
                  <span className={PAGE_STATUS[page.status].className}>
                    {PAGE_STATUS[page.status].label}
                  </span>
                  {page.blockedByAdmin && (
                    <span className="badge badge-red mt-1 block w-max">Bloqueada</span>
                  )}
                </td>
                <td className="whitespace-nowrap">{formatDateTime(page.updatedAt)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Button href={`/admin/paginas/${page.id}`} variant="outline" size="sm">
                      Ver / editar
                    </Button>
                    <form action={adminSetPageBlocked}>
                      <input type="hidden" name="id" value={page.id} />
                      <input type="hidden" name="from" value={here} />
                      <input type="hidden" name="block" value={page.blockedByAdmin ? "0" : "1"} />
                      <Button type="submit" variant="outline" size="sm">
                        {page.blockedByAdmin ? "Reativar" : "Desativar"}
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  Nenhuma página encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>

      <Pagination page={result.page} pages={result.pages} hrefFor={hrefFor} />
    </div>
  );
}

export default function AdminPagesPage({ searchParams }: PageProps<"/admin/paginas">) {
  return (
    <AdminShell title="Páginas" current="/admin/paginas" searchParams={searchParams}>
      <Pages searchParams={searchParams} />
    </AdminShell>
  );
}
