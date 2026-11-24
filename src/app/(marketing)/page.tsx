import { Suspense, type ReactNode } from "react";
import { UserMenu, UserMenuFallback } from "@/components/auth/UserMenu";
import { OfferBanner, OfferPrice } from "@/components/landing/Offer";
import { PhonePreview } from "@/components/landing/PhonePreview";
import {
  ChristmasCard,
  ChristmasFooter,
  ChristmasHeader,
  ChristmasTree,
  Container,
  ElfCharacter,
  GiftBox,
  PrimaryButton,
  PromoButton,
  SectionTitle,
  WoodBackground,
} from "@/components/ui";
import { getDisplayOffer } from "@/modules/pricing/offer";
import { getSettings } from "@/modules/settings/service";
import { DEFAULT_TEMPLATES } from "@/modules/templates/config";

const CREATE_URL = "/criar";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#modelos", label: "Modelos" },
  { href: "#recursos", label: "Recursos" },
  { href: "#preco", label: "Preço" },
  { href: "#duvidas", label: "Dúvidas" },
];

const STEPS = [
  {
    title: "Conte para quem é",
    text: "Escreva os nomes, o título e a mensagem que só vocês dois entendem.",
  },
  {
    title: "Escolha fotos e música",
    text: "Envie as fotos preferidas e a música que marca a história de vocês.",
  },
  {
    title: "Veja como ficou",
    text: "Escolha o modelo e confira a página pronta antes de pagar.",
  },
  {
    title: "Envie o presente",
    text: "Pague por PIX ou cartão e receba o link para mandar pelo WhatsApp.",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const FEATURES = [
  {
    icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    title: "Galeria de fotos",
    text: "Suas fotos em uma galeria animada, do jeito que você organizar.",
  },
  {
    icon: "M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
    title: "Nossa música",
    text: "Uma trilha para tocar enquanto a pessoa lê sua mensagem.",
  },
  {
    icon: "M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z",
    title: "Mensagem especial",
    text: "Suas palavras em um cartão natalino feito para emocionar.",
  },
  {
    icon: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    title: "Link exclusivo",
    text: "Um endereço só de vocês, pronto para compartilhar.",
  },
  {
    icon: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
    title: "Perfeito no celular",
    text: "Abre direto no navegador, sem instalar nenhum aplicativo.",
  },
  {
    icon: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    title: "Edite quando quiser",
    text: "Troque fotos, texto ou música mesmo depois de publicar.",
  },
];

const INCLUDED = [
  "Página exclusiva com o nome de quem você ama",
  "Fotos, música e mensagem personalizadas",
  "Modelos natalinos com animações",
  "Link para compartilhar pelo WhatsApp",
  "Edição liberada depois da compra",
];

function Check() {
  return (
    <span
      aria-hidden="true"
      className="bg-elf-green mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
    >
      ✓
    </span>
  );
}

function Cta({ children, size = "lg" }: { children: ReactNode; size?: "md" | "lg" }) {
  return (
    <PrimaryButton href={CREATE_URL} size={size}>
      {children}
    </PrimaryButton>
  );
}

export default async function LandingPage() {
  const [{ landing }, offer] = await Promise.all([getSettings(), getDisplayOffer()]);

  return (
    <>
      <OfferBanner offer={offer} />
      <ChristmasHeader
        links={NAV}
        actions={
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        }
      />

      <main className="flex-1">
        {/* Banner principal */}
        <WoodBackground lights snow className="overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20">
          <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="animate-rise text-center lg:text-left">
              <span className="tag">Presente digital de Natal</span>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">{landing.heroTitle}</h1>
              <p className="mx-auto mt-5 max-w-xl text-lg opacity-95 sm:text-xl lg:mx-0">
                {landing.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-start">
                <Cta>{landing.ctaLabel}</Cta>
                <div className="text-left">
                  <p className="text-sm opacity-80">Pagamento único</p>
                  <OfferPrice offer={offer} size="md" className="text-gold" />
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <PhonePreview className="animate-pop relative z-10" />
              <ElfCharacter
                pose="wave"
                size={130}
                className="absolute bottom-0 -left-2 z-20 hidden sm:block"
              />
              <ChristmasTree size={110} className="absolute -right-2 bottom-0 hidden sm:block" />
              <GiftBox
                color="gold"
                size={64}
                className="absolute right-2 -bottom-2 z-20 sm:right-16"
              />
              <GiftBox
                color="green"
                size={52}
                className="absolute -bottom-2 left-2 z-20 sm:hidden"
              />
            </div>
          </Container>
        </WoodBackground>

        {/* Como funciona */}
        <WoodBackground id="como-funciona" variant="cream" className="scroll-mt-16 py-16 sm:py-20">
          <Container>
            <SectionTitle
              eyebrow="Como funciona"
              title="Pronto em poucos minutos"
              subtitle="Quatro passos simples. Você não precisa entender de tecnologia."
            />
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <ChristmasCard key={step.title} as="li" tone="white" className="text-center">
                  <span className="bg-primary font-display mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-xl">{step.title}</h3>
                  <p className="mt-2">{step.text}</p>
                </ChristmasCard>
              ))}
            </ol>
          </Container>
        </WoodBackground>

        {/* Exemplos de páginas */}
        <WoodBackground id="modelos" variant="green" snow className="scroll-mt-16 py-16 sm:py-20">
          <Container>
            <SectionTitle
              eyebrow="Modelos"
              title="Escolha o clima do seu presente"
              subtitle="Cada modelo tem suas cores, animações e um jeito próprio de mostrar as fotos."
            />
            <ul className="mt-10 grid gap-10 md:grid-cols-3">
              {DEFAULT_TEMPLATES.map((template, index) => (
                <li key={template.slug} className="flex flex-col items-center text-center">
                  <PhonePreview
                    compact
                    background={template.config.background}
                    recipient={["Maria", "Vovó Lúcia", "Pedro"][index]}
                    sender={["João", "Ana", "Bia"][index]}
                    message={
                      [
                        "Você deixa meu Natal mais bonito. Te amo!",
                        "Obrigada por todos os Natais na sua casa.",
                        "Meu melhor presente é ter você por perto.",
                      ][index]
                    }
                    photos={
                      [
                        [1, 2],
                        [3, 5],
                        [4, 6],
                      ][index]
                    }
                  />
                  <h3 className="mt-5 text-2xl">{template.name}</h3>
                  <p className="mt-1 max-w-xs opacity-90">{template.description}</p>
                </li>
              ))}
            </ul>
          </Container>
        </WoodBackground>

        {/* Recursos */}
        <WoodBackground id="recursos" className="scroll-mt-16 py-16 sm:py-20">
          <Container>
            <SectionTitle
              eyebrow="Recursos"
              title="Tudo o que a sua página tem"
              subtitle="Um presente de verdade, embrulhado com capricho pelos duendes."
            />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <ChristmasCard key={feature.title} as="li" className="flex items-start gap-4">
                  <span className="bg-elf-green flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
                    <Icon d={feature.icon} />
                  </span>
                  <div>
                    <h3 className="text-xl">{feature.title}</h3>
                    <p className="mt-1">{feature.text}</p>
                  </div>
                </ChristmasCard>
              ))}
            </ul>
          </Container>
        </WoodBackground>

        {/* Preço */}
        <WoodBackground id="preco" variant="red" lights className="scroll-mt-16 py-16 sm:py-20">
          <Container size="md">
            <SectionTitle
              title="Um presente que cabe no bolso"
              subtitle="Pagamento único, sem mensalidade."
            />
            <ChristmasCard stitched ribbon className="mx-auto mt-12 max-w-lg pt-10">
              <div className="flex flex-col items-center text-center">
                {offer.promoActive && <span className="tag mb-3">{offer.promoLabel}</span>}
                <p className="font-display text-lg">Sua página de Natal personalizada</p>
                <OfferPrice offer={offer} className="text-primary mt-2 justify-center" />
                <p className="mt-1 text-sm opacity-75">PIX ou cartão de crédito</p>
              </div>
              <ul className="mt-6 space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex justify-center">
                <PromoButton href={CREATE_URL} size="lg" fullWidth>
                  {landing.ctaLabel}
                </PromoButton>
              </div>
            </ChristmasCard>
          </Container>
        </WoodBackground>

        {/* Perguntas frequentes */}
        <WoodBackground id="duvidas" variant="cream" className="scroll-mt-16 py-16 sm:py-20">
          <Container size="md">
            <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
            <div className="mt-8 space-y-3">
              {landing.faq.map((item) => (
                <details
                  key={item.question}
                  className="group shadow-soft rounded-2xl bg-white open:pb-1"
                >
                  <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <span
                      aria-hidden="true"
                      className="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-4">{item.answer}</p>
                </details>
              ))}
            </div>
          </Container>
        </WoodBackground>

        {/* Chamada final */}
        <WoodBackground snow className="overflow-hidden py-16 sm:py-20">
          <Container size="md" className="flex flex-col items-center text-center">
            <div className="flex items-end gap-2">
              <ElfCharacter pose="cheer" size={110} />
              <GiftBox size={80} />
              <ElfCharacter pose="gift" size={110} flip />
            </div>
            <h2 className="mt-6 text-3xl sm:text-4xl">{landing.finalTitle}</h2>
            <p className="mt-3 max-w-xl text-lg opacity-95">{landing.finalSubtitle}</p>
            <div className="mt-8">
              <Cta>{landing.ctaLabel}</Cta>
            </div>
          </Container>
        </WoodBackground>
      </main>

      <ChristmasFooter />
    </>
  );
}
