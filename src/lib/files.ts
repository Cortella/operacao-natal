/**
 * Identificação do formato real de um arquivo pelos primeiros bytes.
 * Nome e tipo informados pelo navegador não são confiáveis.
 */

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "heic";
export type AudioFormat = "mp3" | "m4a" | "ogg" | "wav";

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

export function detectImage(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  if (ascii(bytes, 0, 4) === "GIF8") return "gif";
  if (ascii(bytes, 4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(bytes, 8, 12))) {
    return "heic";
  }
  return null;
}

export function detectAudio(bytes: Uint8Array): AudioFormat | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 3) === "ID3") return "mp3";
  // Quadro MPEG sem cabeçalho ID3: 11 bits de sincronismo e camada III.
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) === 0x02) return "mp3";
  if (ascii(bytes, 4, 8) === "ftyp" && /^(M4A |mp42|isom|M4B )$/.test(ascii(bytes, 8, 12))) {
    return "m4a";
  }
  if (ascii(bytes, 0, 4) === "OggS") return "ogg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") return "wav";
  return null;
}

export const AUDIO_TYPES: Record<AudioFormat, { mime: string; extension: string }> = {
  mp3: { mime: "audio/mpeg", extension: "mp3" },
  m4a: { mime: "audio/mp4", extension: "m4a" },
  ogg: { mime: "audio/ogg", extension: "ogg" },
  wav: { mime: "audio/wav", extension: "wav" },
};

/** Formato de áudio aceito a partir do tipo informado pelo navegador. */
export function audioFormatFromMime(mime: string): AudioFormat | null {
  const normalized = mime.toLowerCase().split(";")[0].trim();
  const aliases: Record<string, AudioFormat> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "m4a",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
  };
  return aliases[normalized] ?? null;
}
