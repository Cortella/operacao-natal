"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** Data de término da oferta (ISO). Com ela, o banner mostra a contagem regressiva. */
  endsAt?: string;
  /** Ação exibida ao lado do texto. */
  action?: ReactNode;
  className?: string;
};

function remaining(endsAt: string, now: number) {
  const diff = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/** Faixa dourada de promoção. Some sozinha quando a oferta termina. */
export function PromotionBanner({ children, endsAt, action, className }: Props) {
  // O relógio só começa no navegador, para o HTML do servidor não depender da hora.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const left = endsAt && now !== null ? remaining(endsAt, now) : null;
  if (endsAt && now !== null && !left) return null;

  const parts = left
    ? [
        ...(left.days > 0 ? [[left.days, "d"] as const] : []),
        [left.hours, "h"] as const,
        [left.minutes, "min"] as const,
        [left.seconds, "s"] as const,
      ]
    : [];

  return (
    <div
      className={cn(
        "bg-gold text-text-dark flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2.5 text-center",
        className,
      )}
    >
      <p className="font-display font-semibold">{children}</p>
      {endsAt && (
        <p
          className="flex items-center gap-1.5 font-extrabold tabular-nums"
          aria-label="Tempo restante da oferta"
        >
          {parts.length > 0 ? (
            parts.map(([value, unit]) => (
              <span key={unit} className="bg-text-dark text-gold rounded-lg px-2 py-0.5 text-sm">
                {String(value).padStart(2, "0")}
                <span className="ml-0.5 text-xs font-semibold">{unit}</span>
              </span>
            ))
          ) : (
            <span className="bg-text-dark text-gold rounded-lg px-2 py-0.5 text-sm">--:--</span>
          )}
        </p>
      )}
      {action}
    </div>
  );
}
