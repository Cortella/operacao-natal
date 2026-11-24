"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  title: string;
  artist?: string;
  /** Título da área. O padrão é "Nossa música". */
  heading?: string;
  loop?: boolean;
  className?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Player da área "Nossa música".
 * A reprodução só começa com um toque do usuário, como exigem as políticas de
 * autoplay dos navegadores; o áudio só é baixado nesse momento.
 */
export function MusicPlayer({
  src,
  title,
  artist,
  heading = "Nossa música",
  loop = true,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  return (
    <div
      className={cn(
        "bg-green-dark text-text-light shadow-card rounded-[var(--radius-card)] p-5 sm:p-6",
        className,
      )}
    >
      <p className="font-display text-gold mb-4 flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden="true">♪</span> {heading}
      </p>

      <div className="flex items-center gap-4">
        {/* Disco que gira enquanto a música toca */}
        <div
          aria-hidden="true"
          className={cn("relative h-16 w-16 shrink-0 rounded-full", playing && "animate-spin-slow")}
          style={{
            background:
              "repeating-radial-gradient(circle, #1a1a1a 0 3px, #2b2b2b 3px 5px), #1a1a1a",
          }}
        >
          <span className="bg-primary border-gold absolute inset-[34%] rounded-full border-2" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-lg leading-tight font-semibold">{title}</p>
          {artist && <p className="truncate text-sm opacity-80">{artist}</p>}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!duration}
            aria-label="Posição da música"
            className="accent-gold mt-2 block h-2 w-full cursor-pointer disabled:cursor-default"
          />
          <div className="mt-0.5 flex justify-between text-xs tabular-nums opacity-80">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pausar ${title}` : `Tocar ${title}`}
          aria-pressed={playing}
          className="bg-gold text-text-dark flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-[0_4px_0_var(--color-gold-dark)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l14 8-14 8z" />}
          </svg>
        </button>
      </div>

      {failed && (
        <p role="alert" className="text-gold mt-3 text-sm">
          Não foi possível tocar esta música agora. Tente novamente em instantes.
        </p>
      )}

      <audio
        ref={audioRef}
        src={src}
        preload="none"
        loop={loop}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
    </div>
  );
}
