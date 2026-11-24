import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";
import { getOrCreateDraftId } from "@/modules/pages/queries";

export const metadata: Metadata = { title: "Criar página" };

/** Retoma o rascunho mais recente ou começa um novo, e abre o editor. */
async function OpenDraft(): Promise<never> {
  const user = await requireUser("/criar");
  const id = await getOrCreateDraftId(user.id, user.name);
  redirect(`/criar/${id}`);
}

export default function CreatePage() {
  return (
    <AppShell footer={false}>
      <OpenDraft />
    </AppShell>
  );
}
