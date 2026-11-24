import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type IconProps = { size?: number; className?: string; style?: CSSProperties };

const giftColors = {
  red: { box: "var(--color-primary)", ribbon: "var(--color-gold)" },
  green: { box: "var(--color-elf-green)", ribbon: "var(--color-primary)" },
  gold: { box: "var(--color-gold)", ribbon: "var(--color-primary)" },
} as const;

/** Caixa de presente com laço. */
export function GiftBox({
  size = 72,
  color = "red",
  className,
  style,
}: IconProps & { color?: keyof typeof giftColors }) {
  const { box, ribbon } = giftColors[color];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <ellipse cx="50" cy="94" rx="38" ry="5" fill="#000" opacity="0.18" />
      <rect x="14" y="44" width="72" height="48" rx="6" fill={box} />
      <rect x="14" y="44" width="72" height="10" fill="#000" opacity="0.12" />
      <rect x="8" y="30" width="84" height="18" rx="6" fill={box} />
      <rect x="43" y="30" width="14" height="62" fill={ribbon} />
      <path
        d="M50 30 Q30 4 20 18 Q16 30 50 30 Q84 30 80 18 Q70 4 50 30 Z"
        fill={ribbon}
        stroke="rgb(0 0 0 / 0.12)"
      />
      <circle cx="50" cy="29" r="6" fill={ribbon} stroke="rgb(0 0 0 / 0.15)" />
    </svg>
  );
}

/** Árvore de Natal ilustrada. */
export function ChristmasTree({ size = 120, className }: IconProps) {
  const lights: Array<[number, number, string]> = [
    [44, 46, "var(--color-gold)"],
    [60, 60, "var(--color-primary)"],
    [36, 78, "var(--color-primary)"],
    [64, 86, "var(--color-gold)"],
    [48, 100, "#fff"],
    [28, 112, "var(--color-gold)"],
    [72, 114, "var(--color-primary)"],
  ];
  return (
    <svg
      viewBox="0 0 100 150"
      width={size}
      height={size * 1.5}
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="50" cy="144" rx="34" ry="5" fill="#000" opacity="0.18" />
      <rect x="42" y="118" width="16" height="24" rx="3" fill="var(--color-wood-medium)" />
      <path d="M50 14 L76 58 H24 Z" fill="var(--color-elf-green)" />
      <path d="M50 40 L84 92 H16 Z" fill="var(--color-elf-green)" />
      <path d="M50 70 L92 124 H8 Z" fill="var(--color-elf-green)" />
      <path d="M50 14 L76 58 H50 Z M50 40 L84 92 H50 Z M50 70 L92 124 H50 Z" opacity="0.14" />
      {lights.map(([cx, cy, fill], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="4"
          fill={fill}
          className="animate-twinkle"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
      <path
        d="M50 2 L53.5 10.5 L62.5 11 L55.5 16.8 L58 25.5 L50 20.6 L42 25.5 L44.5 16.8 L37.5 11 L46.5 10.5 Z"
        fill="var(--color-gold)"
      />
    </svg>
  );
}

const BULBS = ["var(--color-gold)", "var(--color-primary)", "var(--color-elf-green)", "#fff"];

/** Fio de luzes pisca-pisca, para o topo de seções. */
export function StringLights({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex h-8 w-full justify-around overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className={cn("relative block w-4 shrink-0", i >= 12 && "hidden sm:block")}
          style={{ marginTop: i % 2 ? 6 : 0 }}
        >
          <span className="absolute top-0 left-1/2 h-2 w-1.5 -translate-x-1/2 rounded-sm bg-black/50" />
          <span
            className="animate-twinkle absolute top-2 left-1/2 h-4 w-3 -translate-x-1/2 rounded-full"
            style={{
              background: BULBS[i % BULBS.length],
              boxShadow: `0 0 10px 2px ${BULBS[i % BULBS.length]}`,
              animationDelay: `${(i % 5) * 0.35}s`,
            }}
          />
        </span>
      ))}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-black/50" />
    </div>
  );
}

/**
 * Neve caindo, só com CSS. As posições são derivadas do índice para que o
 * servidor e o navegador gerem exatamente o mesmo HTML.
 */
export function Snowfall({ count = 28, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => {
        const size = 4 + ((i * 7) % 6);
        const style = {
          left: `${(i * 37) % 100}%`,
          width: size,
          height: size,
          opacity: 0.45 + ((i * 13) % 5) / 10,
          animationDuration: `${9 + ((i * 11) % 10)}s`,
          animationDelay: `-${(i * 17) % 14}s`,
          "--snow-drift": `${((i * 23) % 60) - 30}px`,
        } as CSSProperties;
        return (
          <span
            key={i}
            className="snowflake animate-snow absolute top-0 rounded-full bg-white"
            style={style}
          />
        );
      })}
    </div>
  );
}

/** Marca: gorro do duende. */
export function HatLogo({ size = 36, className }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M8 46 Q12 8 40 8 Q56 9 58 26 Q50 18 42 22 Q50 34 48 46 Z"
        fill="var(--color-primary)"
        stroke="var(--color-text-light)"
        strokeWidth="2"
      />
      <rect x="4" y="42" width="48" height="14" rx="7" fill="var(--color-gold)" />
      <circle cx="57" cy="29" r="6" fill="var(--color-gold)" />
    </svg>
  );
}
