import "server-only";
import sharp from "sharp";
import { detectImage } from "./files";

/** Lado maior das fotos guardadas; suficiente para telas grandes e leve no celular. */
const MAX_SIDE = 1600;
/** Proteção contra imagens "bomba" com dimensões absurdas. */
const MAX_INPUT_PIXELS = 60_000_000;

export class InvalidImageError extends Error {}

export type ProcessedImage = { data: Buffer; mimeType: "image/webp"; extension: "webp" };

/**
 * Confere se o arquivo é mesmo uma imagem e a regrava do zero em WebP.
 * A regravação corrige a rotação, limita o tamanho e descarta metadados
 * (inclusive a localização GPS que os celulares gravam nas fotos).
 */
export async function processPhoto(input: Buffer): Promise<ProcessedImage> {
  if (!detectImage(input)) {
    throw new InvalidImageError("Envie uma foto em JPG, PNG, WebP ou HEIC.");
  }
  try {
    const data = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { data, mimeType: "image/webp", extension: "webp" };
  } catch {
    throw new InvalidImageError("Não conseguimos ler esta foto. Tente enviar outra.");
  }
}
