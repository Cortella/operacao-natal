/* Ilustrações de exemplo servidas pelo próprio site. */
/* eslint-disable @next/next/no-img-element */

import { ChristmasCard, ElfCharacter, StringLights, type BackgroundVariant } from "@/components/ui";
import { cn } from "@/lib/cn";

const backgroundClass: Record<BackgroundVariant, string> = {
  wood: "bg-wood",
  "wood-light": "bg-wood-light",
  red: "bg-noel-red",
  green: "bg-noel-green",
  cream: "bg-noel-cream",
};

type Props = {
  background?: BackgroundVariant;
  recipient?: string;
  sender?: string;
  message?: string;
  /** Índices (1–6) das ilustrações de exemplo. */
  photos?: number[];
  compact?: boolean;
  className?: string;
};

/**
 * Celular ilustrado mostrando uma página de presente em miniatura.
 * É decorativo: o texto descritivo fica na seção que o usa.
 */
export function PhonePreview({
  background = "wood",
  recipient = "Maria",
  sender = "João",
  message = "Você deixa meu Natal mais bonito. Te amo!",
  photos = [1, 2, 3, 4],
  compact,
  className,
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-wood-deep shadow-card relative mx-auto overflow-hidden rounded-[2.2rem] border-[10px] bg-black",
        compact ? "w-52" : "w-64 sm:w-72",
        className,
      )}
    >
      <div className="absolute top-2 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div
        className={cn(
          "relative flex flex-col items-center px-3 pb-5",
          compact ? "pt-9" : "pt-10",
          backgroundClass[background],
        )}
        style={{ ["--plank" as string]: "44px" }}
      >
        <StringLights className="absolute inset-x-0 top-6" />
        <ElfCharacter pose="gift" size={compact ? 54 : 70} className="relative z-10 -mb-3" />
        <ChristmasCard stitched className="w-full !p-4 text-center">
          <p className="text-primary font-display text-lg leading-tight font-semibold">
            Para {recipient}
          </p>
          <p className="mt-1.5 text-xs leading-snug">“{message}”</p>
          <p className="font-display mt-1.5 text-xs">Com carinho, {sender}</p>
        </ChristmasCard>

        <div className="mt-3 grid w-full grid-cols-2 gap-2">
          {photos.slice(0, compact ? 2 : 4).map((photo, index) => (
            <span
              key={photo}
              className={cn(
                "block rounded bg-white p-1 pb-2 shadow-md",
                index % 2 ? "rotate-2" : "-rotate-2",
              )}
            >
              <img
                src={`/demo/foto-${photo}.svg`}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-sm object-cover"
              />
            </span>
          ))}
        </div>

        <div className="bg-green-dark text-text-light mt-3 flex w-full items-center gap-2 rounded-2xl p-2.5">
          <span className="bg-gold text-text-dark flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7 4l14 8-14 8z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="text-gold font-display block text-[0.65rem] leading-none font-semibold">
              ♪ Nossa música
            </span>
            <span className="mt-1 block h-1.5 rounded-full bg-white/25">
              <span className="bg-gold block h-full w-2/5 rounded-full" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
