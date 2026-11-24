import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, ChristmasCard, FormInput, FormTextarea, PrimaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminRestoreLanding, adminSaveLanding } from "@/modules/admin/actions";
import { getSettings } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Textos", robots: { index: false, follow: false } };

/** Linhas em branco oferecidas para novas perguntas. */
const EXTRA_FAQ_ROWS = 2;

async function Landing() {
  await requireAdmin();
  const { landing } = await getSettings();
  const faq = [
    ...landing.faq,
    ...Array.from({ length: EXTRA_FAQ_ROWS }, () => ({ question: "", answer: "" })),
  ];

  return (
    <ChristmasCard>
      <h2 className="text-primary text-2xl">Textos da landing page</h2>
      <form action={adminSaveLanding} className="mt-4 space-y-4">
        <FormInput
          label="Título principal"
          name="heroTitle"
          required
          maxLength={120}
          defaultValue={landing.heroTitle}
        />
        <FormTextarea
          label="Subtítulo"
          name="heroSubtitle"
          required
          rows={2}
          maxLength={300}
          defaultValue={landing.heroSubtitle}
        />
        <FormInput
          label="Texto do botão principal"
          name="ctaLabel"
          required
          maxLength={60}
          defaultValue={landing.ctaLabel}
        />
        <FormInput
          label="Título da chamada final"
          name="finalTitle"
          required
          maxLength={120}
          defaultValue={landing.finalTitle}
        />
        <FormTextarea
          label="Texto da chamada final"
          name="finalSubtitle"
          required
          rows={2}
          maxLength={300}
          defaultValue={landing.finalSubtitle}
        />

        <fieldset className="space-y-4">
          <legend className="font-display text-xl">Perguntas frequentes</legend>
          <p className="field-hint">Para remover uma pergunta, apague a pergunta e a resposta.</p>
          {faq.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-2xl bg-white p-4">
              <FormInput
                label={`Pergunta ${index + 1}`}
                name="faqQuestion"
                maxLength={200}
                defaultValue={item.question}
              />
              <FormTextarea
                label={`Resposta ${index + 1}`}
                name="faqAnswer"
                rows={2}
                maxLength={1000}
                defaultValue={item.answer}
              />
            </div>
          ))}
        </fieldset>

        <PrimaryButton type="submit">Salvar textos</PrimaryButton>
      </form>

      <form action={adminRestoreLanding} className="mt-4 border-t border-black/10 pt-4">
        <Button type="submit" variant="outline" size="sm">
          Restaurar textos padrão
        </Button>
      </form>
    </ChristmasCard>
  );
}

export default function AdminContentPage({ searchParams }: PageProps<"/admin/conteudo">) {
  return (
    <AdminShell title="Textos da landing" current="/admin/conteudo" searchParams={searchParams}>
      <Landing />
    </AdminShell>
  );
}
