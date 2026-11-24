import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Button,
  ChristmasCard,
  ChristmasFooter,
  ChristmasHeader,
  ChristmasTree,
  Container,
  ElfCharacter,
  ErrorMessage,
  FormInput,
  FormSelect,
  FormTextarea,
  GiftBox,
  LoadingAnimation,
  MusicPlayer,
  PhotoGallery,
  PrimaryButton,
  PromoButton,
  PromotionBanner,
  SecondaryButton,
  SectionTitle,
  SuccessMessage,
  WoodBackground,
  type BackgroundVariant,
  type ElfPose,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

const COLORS = [
  ["primary", "#A01020"],
  ["primary-hover", "#800C19"],
  ["wood-dark", "#503020"],
  ["wood-medium", "#805020"],
  ["wood-light", "#A06040"],
  ["elf-green", "#208050"],
  ["green-dark", "#104030"],
  ["cream", "#F0F0E0"],
  ["gold", "#F0B040"],
  ["text-dark", "#38251B"],
  ["text-light", "#FFF9EF"],
] as const;

const BACKGROUNDS: Array<[BackgroundVariant, string]> = [
  ["wood", "Madeira (padrão)"],
  ["wood-light", "Madeira clara"],
  ["red", "Vermelho natalino"],
  ["green", "Verde-escuro"],
  ["cream", "Creme"],
];

const POSES: Array<[ElfPose, string]> = [
  ["wave", "Acenando"],
  ["gift", "Com presente"],
  ["cheer", "Comemorando"],
  ["idle", "Parado"],
  ["sad", "Chateado (erros)"],
];

const PHOTOS = Array.from({ length: 6 }, (_, i) => ({
  src: `/demo/foto-${i + 1}.svg`,
  alt: `Ilustração de exemplo ${i + 1}`,
  caption: [
    "Nosso primeiro Natal",
    "O presente",
    "Noite feliz",
    "Com amor",
    "A árvore",
    "Surpresa!",
  ][i],
}));

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ChristmasCard as="section" className="space-y-5">
      <h2 className="text-primary text-2xl">{title}</h2>
      {children}
    </ChristmasCard>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <PromotionBanner endsAt="2026-12-25T00:00:00-03:00">
        Oferta de Natal: sua página por R$ 19,90
      </PromotionBanner>
      <ChristmasHeader
        links={[
          { href: "#cores", label: "Cores" },
          { href: "#componentes", label: "Componentes" },
        ]}
        actions={
          <PrimaryButton href="/" size="sm">
            Início
          </PrimaryButton>
        }
      />

      <WoodBackground as="main" lights snow className="flex-1 py-16">
        <Container className="space-y-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <ElfCharacter pose="wave" size={150} title="Duende acenando" />
            <SectionTitle
              align="left"
              eyebrow="Design System"
              title="Oficina do Noel"
              subtitle="Cores, tipografia e componentes compartilhados por toda a plataforma."
            />
          </div>

          <div id="cores">
            <Block title="Cores">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {COLORS.map(([name, hex]) => (
                  <li key={name} className="text-sm">
                    <span
                      className="block h-16 rounded-xl border border-black/10"
                      style={{ background: `var(--color-${name})` }}
                    />
                    <span className="mt-1 block font-bold">{name}</span>
                    <span className="opacity-70">{hex}</span>
                  </li>
                ))}
              </ul>
            </Block>
          </div>

          <Block title="Tipografia">
            <p className="font-display text-4xl font-semibold">
              Fredoka para títulos: coração, ação
            </p>
            <p className="text-lg">
              Nunito Sans para textos. Você deixa meu Natal mais bonito — é fácil de ler, até nas
              mensagens mais longas.
            </p>
            <p className="text-primary text-4xl font-black">R$ 19,90</p>
          </Block>

          <Block title="Fundos">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {BACKGROUNDS.map(([variant, label]) => (
                <WoodBackground
                  key={variant}
                  as="div"
                  variant={variant}
                  className="font-display flex h-44 items-end overflow-hidden rounded-2xl border border-black/10 p-4 text-lg"
                >
                  {label}
                </WoodBackground>
              ))}
            </div>
          </Block>

          <div id="componentes">
            <Block title="Botões">
              <div className="flex flex-wrap items-center gap-4">
                <PrimaryButton>Criar minha página de Natal</PrimaryButton>
                <SecondaryButton>Escolher música</SecondaryButton>
                <PromoButton>Aproveitar oferta</PromoButton>
                <Button variant="outline">Voltar</Button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <PrimaryButton size="sm">Pequeno</PrimaryButton>
                <PrimaryButton size="lg">Grande</PrimaryButton>
                <PrimaryButton disabled>Desabilitado</PrimaryButton>
                <PrimaryButton loading>Salvando</PrimaryButton>
                <SecondaryButton loading>Enviando fotos</SecondaryButton>
              </div>
            </Block>
          </div>

          <Block title="Duendes e ilustrações">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {POSES.map(([pose, label]) => (
                <li key={pose} className="flex flex-col items-center text-center text-sm">
                  <ElfCharacter pose={pose} size={110} />
                  {label}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end justify-center gap-6">
              <GiftBox color="red" />
              <GiftBox color="green" />
              <GiftBox color="gold" />
              <ChristmasTree size={90} />
            </div>
          </Block>

          <Block title="Formulários">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput
                label="Nome de quem vai receber"
                placeholder="Ex.: Maria"
                hint="É o nome que aparece no cartão."
              />
              <FormInput
                label="Seu e-mail"
                type="email"
                defaultValue="joao@"
                error="Digite um e-mail válido."
              />
              <FormSelect label="Modelo da página" defaultValue="oficina">
                <option value="oficina">Oficina do Noel</option>
                <option value="noite">Noite Feliz</option>
              </FormSelect>
              <FormInput label="Cupom" optional disabled placeholder="Indisponível" />
              <FormTextarea
                className="sm:col-span-2"
                label="Mensagem especial"
                defaultValue="Você deixa meu Natal mais bonito. Te amo!"
                maxLength={500}
                count={41}
              />
            </div>
          </Block>

          <div className="grid gap-8 lg:grid-cols-2">
            <ChristmasCard stitched ribbon className="pt-10 text-center">
              <h3 className="text-primary text-2xl">Para Maria</h3>
              <p className="mt-3 text-lg">“Você deixa meu Natal mais bonito. Te amo!”</p>
              <p className="font-display mt-4">Com carinho, João</p>
            </ChristmasCard>
            <MusicPlayer
              src="/music/noite-feliz.wav"
              title="Noite Feliz"
              artist="Caixinha de música"
            />
          </div>

          <Block title="Galeria — polaroid">
            <PhotoGallery photos={PHOTOS} layout="polaroid" />
          </Block>
          <Block title="Galeria — grade">
            <PhotoGallery photos={PHOTOS} layout="grid" />
          </Block>
          <Block title="Galeria — carrossel">
            <PhotoGallery photos={PHOTOS} layout="carousel" />
          </Block>

          <div className="grid gap-8 lg:grid-cols-2">
            <SuccessMessage
              title="Sua página está no ar!"
              actions={<SecondaryButton>Compartilhar no WhatsApp</SecondaryButton>}
            >
              Agora é só enviar o link para quem você ama.
            </SuccessMessage>
            <ErrorMessage
              title="Não deu certo desta vez"
              actions={<PrimaryButton>Tentar de novo</PrimaryButton>}
            >
              Não conseguimos salvar suas fotos. Confira sua conexão e tente novamente.
            </ErrorMessage>
          </div>

          <Block title="Avisos e carregamento">
            <SuccessMessage compact title="Rascunho salvo">
              Você pode continuar depois.
            </SuccessMessage>
            <ErrorMessage compact title="Foto muito grande">
              Envie imagens de até 8 MB.
            </ErrorMessage>
            <LoadingAnimation />
          </Block>
        </Container>
      </WoodBackground>

      <ChristmasFooter />
    </>
  );
}
