import { z } from "zod";

/**
 * Configuração visual de um modelo de página. Fica gravada em `Template.config`
 * e é lida tanto pela pré-visualização do editor quanto pela página pública.
 */
export const templateConfigSchema = z.object({
  /** Fundo do cenário. */
  background: z.enum(["wood", "wood-light", "red", "green", "cream"]),
  /** Cor do cartão central. */
  cardTone: z.enum(["cream", "white"]),
  /** Cor de destaque de títulos e detalhes. */
  accent: z.enum(["red", "green", "gold"]),
  /** Layout da galeria de fotos. */
  galleryLayout: z.enum(["polaroid", "grid", "carousel"]),
  /** Estilo do cartão da mensagem especial. */
  messageStyle: z.enum(["stitched", "ribbon", "plain"]),
  /** Pose do duende que recebe o visitante. */
  elfPose: z.enum(["wave", "gift", "cheer"]),
  /** Animação de abertura do presente. */
  opening: z.enum(["gift", "envelope"]),
  snow: z.boolean(),
  lights: z.boolean(),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  config: TemplateConfig;
};

/** Modelos iniciais da plataforma. O administrador pode editar e criar outros. */
export const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    slug: "oficina-do-noel",
    name: "Oficina do Noel",
    description: "Parede de madeira, luzes e fotos em estilo polaroid.",
    config: {
      background: "wood",
      cardTone: "cream",
      accent: "red",
      galleryLayout: "polaroid",
      messageStyle: "ribbon",
      elfPose: "gift",
      opening: "gift",
      snow: true,
      lights: true,
    },
  },
  {
    slug: "noite-feliz",
    name: "Noite Feliz",
    description: "Verde-escuro com dourado, neve e fotos em grade.",
    config: {
      background: "green",
      cardTone: "cream",
      accent: "gold",
      galleryLayout: "grid",
      messageStyle: "stitched",
      elfPose: "wave",
      opening: "gift",
      snow: true,
      lights: false,
    },
  },
  {
    slug: "laco-vermelho",
    name: "Laço Vermelho",
    description: "Vermelho natalino, cartão branco e fotos em carrossel.",
    config: {
      background: "red",
      cardTone: "white",
      accent: "green",
      galleryLayout: "carousel",
      messageStyle: "ribbon",
      elfPose: "cheer",
      opening: "envelope",
      snow: false,
      lights: true,
    },
  },
];

/** Usado quando a configuração gravada está ausente ou inválida. */
export const FALLBACK_TEMPLATE_CONFIG: TemplateConfig = DEFAULT_TEMPLATES[0].config;

export function parseTemplateConfig(value: unknown): TemplateConfig {
  const result = templateConfigSchema.safeParse(value);
  return result.success ? result.data : FALLBACK_TEMPLATE_CONFIG;
}
