import { describe, expect, it } from "vitest";
import { audioFormatFromMime, detectAudio, detectImage } from "./files";

const bytes = (...values: Array<number | string>) =>
  Uint8Array.from(
    values.flatMap((value) =>
      typeof value === "string" ? [...value].map((char) => char.charCodeAt(0)) : [value],
    ),
  );

const pad = (data: Uint8Array) => Uint8Array.from([...data, ...new Array(16).fill(0)]);

describe("detectImage", () => {
  it("reconhece os formatos aceitos", () => {
    expect(detectImage(pad(bytes(0xff, 0xd8, 0xff, 0xe0)))).toBe("jpeg");
    expect(detectImage(pad(bytes(0x89, "PNG", 0x0d, 0x0a)))).toBe("png");
    expect(detectImage(pad(bytes("RIFF", 0, 0, 0, 0, "WEBP")))).toBe("webp");
    expect(detectImage(pad(bytes(0, 0, 0, 0x18, "ftypheic")))).toBe("heic");
  });

  it("recusa arquivos disfarçados de imagem", () => {
    expect(detectImage(pad(bytes("<?php echo 1; ?>")))).toBeNull();
    expect(detectImage(pad(bytes("<svg xmlns=")))).toBeNull();
    expect(detectImage(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe("detectAudio", () => {
  it("reconhece os formatos aceitos", () => {
    expect(detectAudio(pad(bytes("ID3", 3, 0)))).toBe("mp3");
    expect(detectAudio(pad(bytes(0xff, 0xfb, 0x90, 0x00)))).toBe("mp3");
    expect(detectAudio(pad(bytes(0, 0, 0, 0x20, "ftypM4A ")))).toBe("m4a");
    expect(detectAudio(pad(bytes("OggS")))).toBe("ogg");
    expect(detectAudio(pad(bytes("RIFF", 0, 0, 0, 0, "WAVE")))).toBe("wav");
  });

  it("recusa o que não é áudio", () => {
    expect(detectAudio(pad(bytes("MZ", 0x90, 0)))).toBeNull();
    expect(detectAudio(pad(bytes("RIFF", 0, 0, 0, 0, "WEBP")))).toBeNull();
  });
});

describe("audioFormatFromMime", () => {
  it("aceita variações comuns e recusa o resto", () => {
    expect(audioFormatFromMime("audio/mpeg")).toBe("mp3");
    expect(audioFormatFromMime("audio/x-m4a")).toBe("m4a");
    expect(audioFormatFromMime("video/mp4")).toBeNull();
  });
});
