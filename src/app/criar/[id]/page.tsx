import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getEditorOptions, getOwnedPage } from "@/modules/pages/queries";
import { getCurrentPrice } from "@/modules/pricing/offer";
import { formatBRL } from "@/modules/pricing/price";
import { getSettings } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Editor" };

async function EditorLoader({ params }: Pick<PageProps<"/criar/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/criar/${id}`);
  const [page, options, settings, price] = await Promise.all([
    getOwnedPage(id, user.id),
    getEditorOptions(user.id),
    getSettings(),
    getCurrentPrice(),
  ]);
  // Página de outra pessoa responde igual a página inexistente.
  if (!page) notFound();

  return (
    <Editor
      initialPage={page}
      options={options}
      maxPhotos={settings.pages.maxPhotos}
      priceLabel={formatBRL(price.priceCents)}
      publicUrl={page.slug ? `${env().APP_URL}/presente/${page.slug}` : null}
    />
  );
}

export default function EditorPage({ params }: PageProps<"/criar/[id]">) {
  return (
    <AppShell footer={false}>
      <EditorLoader params={params} />
    </AppShell>
  );
}
