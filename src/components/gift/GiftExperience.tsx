"use client";

import { useState } from "react";
import { ElfCharacter, PrimaryButton, Snowfall, StringLights } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { GiftPageView as GiftPageData } from "@/modules/pages/schema";
import { GiftPageView } from "./GiftPageView";

const MUSIC_EVENT = "noel:abrir-presente";

const coverBackground = {
  wood: "bg-wood",
  "wood-light": "bg-wood-light",
  red: "bg-noel-red",
  green: "bg-noel-green",
  cream: "bg-noel-cream",
} as const;

/** Caixa de presente grande cuja tampa salta ao abrir. */
function BigGift({ opening }: { opening: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="w-44 sm:w-52" aria-hidden="true">
      <ellipse cx="100" cy="188" rx="74" ry="9" fill="#000" opacity="0.2" />
      <rect x="32" y="92" width="136" height="92" rx="10" fill="var(--color-primary)" />
      <rect x="32" y="92" width="136" height="16" fill="#000" opacity="0.14" />
      <rect x="88" y="92" width="24" height="92" fill="var(--color-gold)" />
      <g
        className="transition-transform duration-700 ease-out"
        style={{
          transformOrigin: "100px 90px",
          transform: opening ? "translateY(-70px) rotate(-18deg)" : undefined,
          opacity: opening ? 0 : 1,
          transitionProperty: "transform, opacity",
        }}
      >
        <rect x="22" y="66" width="156" height="32" rx="10" fill="var(--color-primary)" />
        <rect x="22" y="66" width="156" height="6" rx="3" fill="#fff" opacity="0.14" />
        <rect x="88" y="66" width="24" height="32" fill="var(--color-gold)" />
        <path
          d="M100 66 Q62 14 42 42 Q36 66 100 66 Q164 66 158 42 Q138 14 100 66 Z"
          fill="var(--color-gold)"
          stroke="rgb(0 0 0 / 0.12)"
        />
        <circle cx="100" cy="64" r="11" fill="var(--color-gold)" stroke="rgb(0 0 0 / 0.15)" />
      </g>
    </svg>
  );
}

/** Envelope cuja aba se levanta ao abrir. */
function BigEnvelope({ opening }: { opening: boolean }) {
  return (
    <svg viewBox="0 0 200 160" className="w-48 sm:w-56" aria-hidden="true">
      <ellipse cx="100" cy="150" rx="78" ry="8" fill="#000" opacity="0.2" />
      <rect x="20" y="40" width="160" height="104" rx="10" fill="var(--color-cream)" />
      <path d="M20 144 L100 84 L180 144 Z" fill="var(--color-cream-dark)" />
      <path
        d="M20 46 Q20 40 28 40 H172 Q180 40 180 46 L100 104 Z"
        fill="#fff"
        stroke="var(--color-cream-dark)"
        strokeWidth="2"
        className="transition-transform duration-700 ease-out"
        style={{
          transformOrigin: "100px 40px",
          transform: opening ? "rotateX(180deg)" : undefined,
        }}
      />
      <circle cx="100" cy="98" r="15" fill="var(--color-primary)" />
      <path
        d="M100 106 C90 99 92 91 97 91 C99 91 100 93 100 94 C100 93 101 91 103 91 C108 91 110 99 100 106Z"
        fill="var(--color-gold)"
      />
    </svg>
  );
}

/**
 * Experiência completa do link público: a pessoa vê o presente fechado, toca para
 * abrir e a página aparece. O toque também inicia a música, porque os navegadores
 * só permitem som depois de uma interação.
 */
export function GiftExperience({ page }: { page: GiftPageData }) {
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");
  const { template } = page;
  const onDark = template.background !== "cream";

  function open() {
    if (stage !== "closed") return;
    window.dispatchEvent(new Event(MUSIC_EVENT));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStage("open");
      return;
    }
    setStage("opening");
    setTimeout(() => setStage("open"), 1100);
  }

  return (
    <>
      {/* A página já está montada por baixo, para o áudio poder começar no toque. */}
      <div inert={stage !== "open"} className="flex flex-1 flex-col">
        <GiftPageView page={page} musicStartEvent={MUSIC_EVENT} className="flex-1" />
      </div>

      {stage !== "open" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Você recebeu um presente"
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center transition-opacity duration-500",
            coverBackground[template.background],
            stage === "opening" && "opacity-0 delay-500",
          )}
        >
          {template.snow && <Snowfall />}
          {template.lights && <StringLights className="absolute inset-x-0 top-0" />}

          <div className="animate-rise relative flex flex-col items-center">
            <p className={cn("font-display text-xl", !onDark && "text-text-dark")}>
              {page.senderName ? `${page.senderName} preparou` : "Alguém preparou"} um presente para
            </p>
            <h1
              className={cn(
                "mt-1 max-w-full text-5xl break-words sm:text-6xl",
                onDark ? "text-gold" : "text-primary",
              )}
            >
              {page.recipientName}
            </h1>

            <div className="mt-8 flex items-end justify-center gap-1">
              <ElfCharacter pose="wave" size={96} className="hidden sm:block" />
              <button
                type="button"
                onClick={open}
                aria-label="Abrir presente"
                className={cn(
                  "cursor-pointer transition-transform hover:scale-105",
                  stage === "closed" && "animate-bob",
                )}
              >
                {template.opening === "envelope" ? (
                  <BigEnvelope opening={stage === "opening"} />
                ) : (
                  <BigGift opening={stage === "opening"} />
                )}
              </button>
              <ElfCharacter pose="cheer" size={96} flip />
            </div>

            <PrimaryButton size="lg" className="mt-8" onClick={open}>
              Abrir presente
            </PrimaryButton>
            {page.music && (
              <p className="mt-3 text-sm opacity-80">♪ Tem música: ajuste o volume do aparelho.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
