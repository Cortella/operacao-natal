/* Miniaturas vêm do storage dos usuários. */
/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Button,
  ChristmasCard,
  FormInput,
  FormTextarea,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminDeletePage, adminSetPageBlocked, adminUpdatePage } from "@/modules/admin/actions";
import { ORDER_STATUS, PAGE_STATUS, formatDateTime, toLocalInput } from "@/modules/admin/format";
import { getAdminPage } from "@/modules/admin/queries";
import { LIMITS } from "@/modules/pages/schema";
import { formatBRL } from "@/modules/pricing/price";

export const metadata: Metadata = { title: "Página", robots: { index: false, follow: false } };

async function Detail({ params }: Pick<PageProps<"/admin/paginas/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const page = await getAdminPage(id);
  if (!page) notFound();
  const special = page.messages[0];
  const here = `/admin/paginas/${page.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <ChristmasCard>
        <h2 className="text-primary text-2xl">Conteúdo</h2>
        <form action={adminUpdatePage} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={page.id} />
          <FormInput
            label="Comprador (nome na página)"
            name="senderName"
            defaultValue={page.senderName}
            maxLength={LIMITS.name}
          />
          <FormInput
            label="Destinatário"
            name="recipientName"
            defaultValue={page.recipientName}
            maxLength={LIMITS.name}
          />
          <FormInput
            className="sm:col-span-2"
            label="Título"
            name="title"
            defaultValue={page.title}
            maxLength={LIMITS.title}
          />
          <FormTextarea
            className="sm:col-span-2"
            label="Texto de introdução"
            name="introText"
            rows={2}
            defaultValue={page.introText}
            maxLength={LIMITS.introText}
          />
          <FormTextarea
            className="sm:col-span-2"
            label="Mensagem principal"
            name="mainMessage"
            rows={4}
            defaultValue={page.mainMessage}
            maxLength={LIMITS.mainMessage}
          />
          <FormTextarea
            className="sm:col-span-2"
            label="Mensagem especial"
            name="specialContent"
            rows={3}
            defaultValue={special?.content ?? ""}
            maxLength={LIMITS.specialMessage}
          />
          <FormInput
            label="Assinatura"
            name="specialSignature"
            defaultValue={special?.signature ?? ""}
            maxLength={LIMITS.signature}
          />
          <FormInput
            label="Expira em"
            name="expiresAt"
            type="datetime-local"
            defaultValue={toLocalInput(page.expiresAt)}
            hint="Horário de Brasília. Vazio = não expira."
          />
          <div className="sm:col-span-2">
            <PrimaryButton type="submit">Salvar alterações</PrimaryButton>
          </div>
        </form>

        {page.photos.length > 0 && (
          <>
            <h3 className="mt-8 text-xl">Fotos ({page.photos.length})</h3>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {page.photos.map((photo) => (
                <li key={photo.id}>
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.url}
                      alt={photo.caption || "Foto da página"}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </ChristmasCard>

      <div className="space-y-6">
        <ChristmasCard tone="white" className="!p-5">
          <h2 className="text-xl">Situação</h2>
          <p className="mt-2 flex flex-wrap gap-2">
            <span className={PAGE_STATUS[page.status].className}>
              {PAGE_STATUS[page.status].label}
            </span>
            {page.blockedByAdmin && <span className="badge badge-red">Bloqueada</span>}
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div>
              <dt className="inline font-bold">Conta: </dt>
              <dd className="inline break-all">
                {page.owner.name} ({page.owner.email})
              </dd>
            </div>
            <div>
              <dt className="inline font-bold">Criada: </dt>
              <dd className="inline">{formatDateTime(page.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline font-bold">Publicada: </dt>
              <dd className="inline">{formatDateTime(page.publishedAt)}</dd>
            </div>
            <div>
              <dt className="inline font-bold">Modelo: </dt>
              <dd className="inline">{page.template?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="inline font-bold">Música: </dt>
              <dd className="inline">{page.music?.title ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {page.slug && page.status === "PUBLISHED" && (
              <SecondaryButton href={`/presente/${page.slug}`} target="_blank" size="sm">
                Abrir presente
              </SecondaryButton>
            )}
            <form action={adminSetPageBlocked}>
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="from" value={here} />
              <input type="hidden" name="block" value={page.blockedByAdmin ? "0" : "1"} />
              <Button type="submit" variant="outline" size="sm">
                {page.blockedByAdmin ? "Reativar página" : "Desativar página"}
              </Button>
            </form>
          </div>
        </ChristmasCard>

        <ChristmasCard tone="white" className="!p-5">
          <h2 className="text-xl">Pedidos</h2>
          {page.orders.length === 0 ? (
            <p className="mt-2 text-sm">Nenhum pedido.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {page.orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2">
                  <span>
                    {formatBRL(order.totalCents)} · {formatDateTime(order.createdAt)}
                  </span>
                  <span className={ORDER_STATUS[order.status].className}>
                    {ORDER_STATUS[order.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChristmasCard>

        <ChristmasCard tone="white" className="border-danger border-2 !p-5">
          <h2 className="text-danger text-xl">Excluir página</h2>
          <p className="mt-2 text-sm">
            Apaga textos e fotos de forma definitiva. Pedidos e pagamentos são mantidos como
            registro financeiro.
          </p>
          <form action={adminDeletePage} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={page.id} />
            <FormInput
              label='Digite "EXCLUIR" para confirmar'
              name="confirm"
              autoComplete="off"
              required
            />
            <PrimaryButton type="submit" size="sm">
              Excluir definitivamente
            </PrimaryButton>
          </form>
        </ChristmasCard>
      </div>
    </div>
  );
}

export default function AdminPageDetail({
  params,
  searchParams,
}: PageProps<"/admin/paginas/[id]">) {
  return (
    <AdminShell title="Detalhes da página" current="/admin/paginas" searchParams={searchParams}>
      <Detail params={params} />
    </AdminShell>
  );
}
