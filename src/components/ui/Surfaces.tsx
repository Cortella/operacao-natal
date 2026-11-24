import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Snowfall, StringLights } from "./Decorations";

export type BackgroundVariant = "wood" | "wood-light" | "red" | "green" | "cream";

const backgroundClass: Record<BackgroundVariant, string> = {
  wood: "bg-wood",
  "wood-light": "bg-wood-light",
  red: "bg-noel-red",
  green: "bg-noel-green",
  cream: "bg-noel-cream",
};

type WoodBackgroundProps = {
  variant?: BackgroundVariant;
  as?: ElementType;
  /** Fio de luzes no topo. */
  lights?: boolean;
  /** Neve caindo sobre a seção. */
  snow?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
};

/**
 * Seção com um dos fundos da Oficina do Noel. O padrão é a parede de madeira;
 * as variantes cobrem os fundos alternativos (vermelho, verde, creme, madeira clara).
 */
export function WoodBackground({
  variant = "wood",
  as: Tag = "section",
  lights,
  snow,
  className,
  children,
  id,
}: WoodBackgroundProps) {
  return (
    <Tag id={id} className={cn("relative isolate", backgroundClass[variant], className)}>
      {snow && <Snowfall className="-z-10" />}
      {lights && <StringLights className="absolute inset-x-0 top-0" />}
      {children}
    </Tag>
  );
}

/** Largura máxima e respiro lateral padrão das páginas. */
export function Container({
  className,
  children,
  size = "lg",
}: {
  className?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const max = { sm: "max-w-xl", md: "max-w-3xl", lg: "max-w-6xl" }[size];
  return <div className={cn("mx-auto w-full px-5 sm:px-8", max, className)}>{children}</div>;
}

type ChristmasCardProps = {
  tone?: "cream" | "white";
  /** Costura dourada pontilhada por dentro da borda. */
  stitched?: boolean;
  /** Laço vermelho no canto superior. */
  ribbon?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

/** Cartão padrão: fundo claro, cantos arredondados e sombra suave. */
export function ChristmasCard({
  tone = "cream",
  stitched,
  ribbon,
  as: Tag = "div",
  className,
  children,
}: ChristmasCardProps) {
  return (
    <Tag
      className={cn(
        "card",
        tone === "white" && "card-white",
        stitched && "card-stitched",
        className,
      )}
    >
      {ribbon && (
        <svg
          viewBox="0 0 80 60"
          className="absolute -top-5 left-1/2 w-20 -translate-x-1/2 drop-shadow-md"
          aria-hidden="true"
        >
          <path d="M40 30 Q14 -2 6 16 Q2 34 40 30 Z" fill="var(--color-primary)" />
          <path d="M40 30 Q66 -2 74 16 Q78 34 40 30 Z" fill="var(--color-primary)" />
          <path d="M40 30 L26 58 L36 52 L40 60 L44 52 L54 58 Z" fill="var(--color-primary-hover)" />
          <circle cx="40" cy="30" r="8" fill="var(--color-gold)" />
        </svg>
      )}
      {children}
    </Tag>
  );
}

/** Título de seção com etiqueta opcional acima. */
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow && <span className="tag mb-3">{eyebrow}</span>}
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-lg opacity-90">{subtitle}</p>}
    </div>
  );
}
