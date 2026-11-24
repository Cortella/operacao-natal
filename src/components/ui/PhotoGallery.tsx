"use client";

/* As fotos vêm do storage dos usuários, em tamanhos já tratados no upload. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type GalleryPhoto = { src: string; alt?: string; caption?: string };
export type GalleryLayout = "polaroid" | "grid" | "carousel";

type Props = {
  photos: GalleryPhoto[];
  layout?: GalleryLayout;
  className?: string;
};

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

/** Galeria de fotos com três layouts e ampliação ao tocar. */
export function PhotoGallery({ photos, layout = "polaroid", className }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  if (photos.length === 0) return null;

  const step = (delta: number) =>
    setOpen((index) => (index === null ? index : (index + delta + photos.length) % photos.length));

  const active = open !== null ? photos[open] : null;

  return (
    <>
      <ul
        className={cn(
          layout === "carousel" &&
            "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8",
          layout === "grid" && "grid grid-cols-2 gap-3 sm:grid-cols-3",
          layout === "polaroid" && "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3",
          className,
        )}
      >
        {photos.map((photo, index) => (
          <li
            key={`${photo.src}-${index}`}
            className={cn(
              "animate-rise",
              layout === "carousel" && "w-[78%] shrink-0 snap-center sm:w-[44%]",
            )}
            style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
              className={cn(
                "group block w-full cursor-pointer transition-transform duration-300 hover:z-10 hover:scale-[1.03] hover:rotate-0",
                layout === "polaroid" &&
                  cn("shadow-card rounded-md bg-white p-2 pb-3", TILTS[index % TILTS.length]),
                layout !== "polaroid" && "shadow-soft overflow-hidden rounded-2xl",
              )}
            >
              <img
                src={photo.src}
                alt={photo.alt ?? ""}
                loading="lazy"
                className={cn(
                  "aspect-square w-full object-cover",
                  layout === "polaroid" && "rounded-sm",
                  layout === "carousel" && "aspect-[4/5]",
                )}
              />
              {layout === "polaroid" && (
                <span className="font-display text-text-dark mt-2 block min-h-5 truncate text-center text-sm">
                  {photo.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
        aria-label="Foto ampliada"
        className="m-auto max-h-[92dvh] w-[min(92vw,720px)] bg-transparent p-0 backdrop:bg-black/80"
      >
        {active && (
          <div className="animate-pop relative rounded-lg bg-white p-2 pb-3">
            <img
              src={active.src}
              alt={active.alt ?? ""}
              className="max-h-[76dvh] w-full rounded object-contain"
            />
            {active.caption && (
              <p className="font-display text-text-dark mt-2 text-center">{active.caption}</p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => step(-1)}
                aria-label="Foto anterior"
              >
                ←
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>
                Fechar
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => step(1)}
                aria-label="Próxima foto"
              >
                →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
