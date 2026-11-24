import { z } from "zod";

/** Preço e promoção. Valores em centavos. */
export const pricingSchema = z.object({
  priceCents: z.number().int().min(100).max(1_000_000),
  /** Preço promocional; nulo quando não há promoção. */
  promoPriceCents: z.number().int().min(100).max(1_000_000).nullable(),
  /** Texto da faixa de promoção. */
  promoLabel: z.string().max(120),
  /** Fim da promoção (ISO). Nulo = sem prazo. */
  promoEndsAt: z.iso.datetime({ offset: true }).nullable(),
});

export const landingSchema = z.object({
  heroTitle: z.string().min(1).max(120),
  heroSubtitle: z.string().min(1).max(300),
  ctaLabel: z.string().min(1).max(60),
  finalTitle: z.string().min(1).max(120),
  finalSubtitle: z.string().min(1).max(300),
  faq: z
    .array(z.object({ question: z.string().min(1).max(200), answer: z.string().min(1).max(1000) }))
    .max(20),
});

export const pagesSchema = z.object({
  /** Dias que a página fica no ar depois de publicada. Nulo = não expira. */
  expirationDays: z.number().int().min(1).max(3650).nullable(),
  maxPhotos: z.number().int().min(1).max(30),
});

export const settingsSchemas = {
  pricing: pricingSchema,
  landing: landingSchema,
  pages: pagesSchema,
} as const;

export type SettingKey = keyof typeof settingsSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingsSchemas)[K]> };

export const DEFAULT_SETTINGS: Settings = {
  pricing: {
    priceCents: 1990,
    promoPriceCents: null,
    promoLabel: "Oferta de Natal por tempo limitado",
    promoEndsAt: null,
  },
  landing: {
    heroTitle: "Transforme seu carinho em uma página de Natal",
    heroSubtitle:
      "Junte fotos, uma música e uma mensagem só de vocês. Os duendes embrulham tudo em um link para presentear quem você ama.",
    ctaLabel: "Criar minha página de Natal",
    finalTitle: "O presente mais pessoal deste Natal",
    finalSubtitle: "Leva poucos minutos e fica pronto para enviar pelo WhatsApp.",
    faq: [
      {
        question: "Como a pessoa recebe o presente?",
        answer:
          "Depois do pagamento você recebe um link exclusivo. É só enviar pelo WhatsApp ou por onde preferir; a pessoa abre no celular, sem instalar nada.",
      },
      {
        question: "Preciso saber mexer com tecnologia?",
        answer:
          "Não. Você preenche os nomes, escolhe as fotos, a música e escreve a mensagem. A página é montada sozinha, e você vê como ficou antes de pagar.",
      },
      {
        question: "Quais são as formas de pagamento?",
        answer: "PIX e cartão de crédito. A página é publicada assim que o pagamento é confirmado.",
      },
      {
        question: "Posso alterar a página depois de pronta?",
        answer: "Sim. Você pode entrar na sua conta e editar textos, fotos e música quando quiser.",
      },
      {
        question: "Minhas fotos ficam públicas?",
        answer:
          "Elas aparecem apenas para quem tiver o link do presente. Você pode tirar a página do ar ou pedir a exclusão dos seus dados a qualquer momento.",
      },
    ],
  },
  pages: { expirationDays: null, maxPhotos: 12 },
};
