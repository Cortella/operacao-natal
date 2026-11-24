import {
  ChristmasCard,
  ChristmasTree,
  Container,
  ElfCharacter,
  GiftBox,
  MusicPlayer,
  PhotoGallery,
  WoodBackground,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { GiftPageView as GiftPageData } from "@/modules/pages/schema";

const accentClass = {
  red: "text-primary",
  green: "text-elf-green",
  gold: "text-gold-dark",
} as const;

type Props = {
  page: GiftPageData;
  /**
   * Na prévia do editor, campos vazios mostram um texto de exemplo esmaecido
   * para a pessoa ver onde cada coisa vai aparecer.
   */
  preview?: boolean;
  className?: string;
};

function Placeholder({ children }: { children: string }) {
  return <span className="italic opacity-45">{children}</span>;
}

/**
 * A página de presente. É o mesmo componente na prévia do editor e no link
 * público, então o que o comprador vê antes de pagar é o que será entregue.
 */
export function GiftPageView({ page, preview = false, className }: Props) {
  const { template } = page;
  const accent = accentClass[template.accent];
  const onDark = template.background !== "cream";
  const show = (value: string, example: string) =>
    value ? value : preview ? <Placeholder>{example}</Placeholder> : null;

  return (
    <WoodBackground
      as="article"
      variant={template.background}
      lights={template.lights}
      snow={template.snow}
      className={cn("overflow-hidden pt-14 pb-12", className)}
    >
      <Container size="sm" className="flex flex-col items-center gap-8">
        <header className="flex flex-col items-center text-center">
          <ElfCharacter pose={template.elfPose} size={130} className="relative z-10 -mb-2" />
          <h1 className={cn("text-4xl sm:text-5xl", onDark ? "text-text-light" : accent)}>
            {show(page.title, "Título da sua página")}
          </h1>
          {(page.introText || preview) && (
            <p className="mt-3 max-w-md text-lg whitespace-pre-line opacity-95">
              {show(page.introText, "Um texto de introdução para dar as boas-vindas.")}
            </p>
          )}
        </header>

        <ChristmasCard
          tone={template.cardTone}
          stitched
          ribbon
          className="animate-rise w-full pt-10 text-center"
        >
          <p className="font-display text-lg">Para</p>
          <p className={cn("font-display text-4xl font-semibold break-words", accent)}>
            {show(page.recipientName, "quem você ama")}
          </p>
          <p className="mt-5 text-lg break-words whitespace-pre-line">
            {show(page.mainMessage, "Sua mensagem principal aparece aqui.")}
          </p>
          {(page.senderName || preview) && (
            <p className="font-display mt-5 text-lg">
              Com carinho, {show(page.senderName, "você")}
            </p>
          )}
        </ChristmasCard>

        {page.photos.length > 0 ? (
          <section aria-label="Fotos" className="w-full">
            <PhotoGallery
              photos={page.photos.map((photo) => ({
                src: photo.url,
                caption: photo.caption,
                alt: photo.caption || `Foto para ${page.recipientName}`,
              }))}
              layout={template.galleryLayout}
            />
          </section>
        ) : (
          preview && (
            <p
              className={cn(
                "w-full rounded-2xl border-2 border-dashed p-6 text-center italic opacity-60",
                onDark ? "border-white/50" : "border-black/30",
              )}
            >
              Suas fotos aparecem aqui.
            </p>
          )
        )}

        {page.music && (
          <MusicPlayer
            src={page.music.url}
            title={page.music.title}
            artist={page.music.artist ?? undefined}
            className="w-full"
          />
        )}

        {page.special && (
          <ChristmasCard
            tone={template.cardTone}
            stitched={template.messageStyle === "stitched"}
            ribbon={template.messageStyle === "ribbon"}
            className={cn(
              "animate-rise w-full text-center",
              template.messageStyle === "ribbon" && "pt-10",
            )}
          >
            <p
              className={cn(
                "font-display text-2xl leading-snug break-words whitespace-pre-line",
                accent,
              )}
            >
              “{page.special.content}”
            </p>
            {page.special.signature && (
              <p className="font-display mt-4 text-lg">{page.special.signature}</p>
            )}
          </ChristmasCard>
        )}

        <footer className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="flex items-end gap-3" aria-hidden="true">
            <GiftBox color="gold" size={56} />
            <ChristmasTree size={70} />
            <GiftBox color={template.background === "red" ? "green" : "red"} size={48} />
          </div>
          <p className="font-display text-lg">Feliz Natal!</p>
          <p className="text-sm opacity-75">Presente feito na Oficina do Noel</p>
        </footer>
      </Container>
    </WoodBackground>
  );
}
