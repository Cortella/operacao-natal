import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { PhonePreview } from "@/components/landing/PhonePreview";
import { Button, ChristmasCard, FormInput, FormSelect, PrimaryButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { adminDeleteTemplate, adminSaveTemplate } from "@/modules/admin/actions";
import { listTemplates } from "@/modules/admin/queries";
import { FALLBACK_TEMPLATE_CONFIG, type TemplateConfig } from "@/modules/templates/config";

export const metadata: Metadata = { title: "Modelos", robots: { index: false, follow: false } };

const OPTIONS: Array<{
  name: keyof TemplateConfig;
  label: string;
  values: Array<[string, string]>;
}> = [
  {
    name: "background",
    label: "Fundo do cenário",
    values: [
      ["wood", "Madeira"],
      ["wood-light", "Madeira clara"],
      ["red", "Vermelho natalino"],
      ["green", "Verde-escuro"],
      ["cream", "Creme"],
    ],
  },
  {
    name: "cardTone",
    label: "Cor do cartão",
    values: [
      ["cream", "Creme"],
      ["white", "Branco"],
    ],
  },
  {
    name: "accent",
    label: "Cor de destaque",
    values: [
      ["red", "Vermelho"],
      ["green", "Verde"],
      ["gold", "Dourado"],
    ],
  },
  {
    name: "galleryLayout",
    label: "Layout das fotos",
    values: [
      ["polaroid", "Polaroid"],
      ["grid", "Grade"],
      ["carousel", "Carrossel"],
    ],
  },
  {
    name: "messageStyle",
    label: "Cartão da mensagem especial",
    values: [
      ["ribbon", "Com laço"],
      ["stitched", "Costura dourada"],
      ["plain", "Simples"],
    ],
  },
  {
    name: "elfPose",
    label: "Duende",
    values: [
      ["gift", "Com presente"],
      ["wave", "Acenando"],
      ["cheer", "Comemorando"],
    ],
  },
  {
    name: "opening",
    label: "Animação de abertura",
    values: [
      ["gift", "Caixa de presente"],
      ["envelope", "Envelope"],
    ],
  },
];

type TemplateRow = Awaited<ReturnType<typeof listTemplates>>[number];

function TemplateForm({ template }: { template?: TemplateRow }) {
  const config = template?.config ?? FALLBACK_TEMPLATE_CONFIG;
  return (
    <form action={adminSaveTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {template && <input type="hidden" name="id" value={template.id} />}
      <FormInput label="Nome" name="name" required maxLength={60} defaultValue={template?.name} />
      <FormInput
        className="lg:col-span-2"
        label="Descrição"
        name="description"
        required
        maxLength={160}
        defaultValue={template?.description}
      />
      {OPTIONS.map((option) => (
        <FormSelect
          key={option.name}
          label={option.label}
          name={option.name}
          defaultValue={String(config[option.name])}
        >
          {option.values.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormSelect>
      ))}
      <FormInput
        label="Ordem de exibição"
        name="sortOrder"
        type="number"
        min={0}
        max={999}
        defaultValue={template?.sortOrder ?? 0}
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2 lg:col-span-3">
        {(
          [
            ["snow", "Neve caindo", config.snow],
            ["lights", "Fio de luzes", config.lights],
            ["active", "Disponível para os compradores", template?.active ?? true],
          ] as const
        ).map(([name, label, checked]) => (
          <label key={name} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name={name}
              defaultChecked={checked}
              className="accent-elf-green h-5 w-5"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <PrimaryButton type="submit">{template ? "Salvar modelo" : "Criar modelo"}</PrimaryButton>
      </div>
    </form>
  );
}

async function Templates() {
  await requireAdmin();
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      {templates.map((template) => (
        <ChristmasCard key={template.id}>
          <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-2 text-center">
              <PhonePreview compact background={template.config.background} photos={[1, 3]} />
              <span className={template.active ? "badge badge-green" : "badge"}>
                {template.active ? "Ativo" : "Inativo"}
              </span>
              <span className="text-sm opacity-75">{template._count.pages} página(s) usam</span>
            </div>
            <div>
              <h2 className="text-primary mb-4 text-2xl">{template.name}</h2>
              <TemplateForm template={template} />
              <form action={adminDeleteTemplate} className="mt-3">
                <input type="hidden" name="id" value={template.id} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  aria-label={`Excluir modelo ${template.name}`}
                >
                  Excluir modelo
                </Button>
              </form>
            </div>
          </div>
        </ChristmasCard>
      ))}

      <ChristmasCard tone="white">
        <h2 className="text-primary mb-4 text-2xl">Novo modelo</h2>
        <TemplateForm />
      </ChristmasCard>
    </div>
  );
}

export default function AdminTemplatesPage({ searchParams }: PageProps<"/admin/modelos">) {
  return (
    <AdminShell title="Modelos de página" current="/admin/modelos" searchParams={searchParams}>
      <Templates />
    </AdminShell>
  );
}
