// Gera os arquivos de demonstração da plataforma, todos livres de direitos:
// - músicas em WAV sintetizadas a partir de melodias em domínio público;
// - fotos ilustradas em SVG para exemplos e para a vitrine do Design System.
//
// Uso: node scripts/generate-assets.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const publicDir = join(process.cwd(), "public");

/* ----------------------------- Músicas ----------------------------- */

const SAMPLE_RATE = 22050;
const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "E4" -> frequência em Hz. "-" é pausa. */
function frequency(note) {
  if (note === "-") return 0;
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(note);
  const semitone =
    NOTES[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + (octave - 4) * 12;
  return 261.63 * 2 ** (semitone / 12);
}

/** Timbre de caixinha de música: fundamental mais harmônicos, com decaimento. */
function render(melody, beatSeconds) {
  const total = melody.reduce((sum, [, beats]) => sum + beats, 0) * beatSeconds + 1.5;
  const samples = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  let start = 0;
  for (const [note, beats] of melody) {
    const hz = frequency(note);
    if (hz > 0) {
      const ring = Math.min(beats * beatSeconds + 0.9, 2.2);
      const length = Math.floor(ring * SAMPLE_RATE);
      const offset = Math.floor(start * SAMPLE_RATE);
      for (let i = 0; i < length && offset + i < samples.length; i++) {
        const t = i / SAMPLE_RATE;
        const envelope = Math.min(1, t / 0.004) * Math.exp(-3.2 * t);
        const wave =
          Math.sin(2 * Math.PI * hz * t) +
          0.35 * Math.sin(2 * Math.PI * hz * 2 * t) * Math.exp(-4 * t) +
          0.18 * Math.sin(2 * Math.PI * hz * 4 * t) * Math.exp(-8 * t);
        samples[offset + i] += 0.3 * envelope * wave;
      }
    }
    start += beats * beatSeconds;
  }
  return samples;
}

function toWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

const parse = (text) =>
  text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [note, beats] = token.split(":");
      return [note, Number(beats)];
    });

// Todas as composições abaixo estão em domínio público.
const SONGS = {
  // "Jingle Bells" — James Lord Pierpont, 1857.
  "bate-o-sino": {
    beat: 0.3,
    melody: parse(`
      E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4
      F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2
      E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4
      F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 G4:1 G4:1 F4:1 D4:1 C4:4
    `),
  },
  // "Stille Nacht" (Noite Feliz) — Franz Xaver Gruber, 1818.
  "noite-feliz": {
    beat: 0.42,
    melody: parse(`
      G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3
      D5:2 D5:1 B4:3 C5:2 C5:1 G4:3
      A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3
      A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3
      D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3
      C5:1 G4:1 E4:1 G4:1.5 F4:.5 D4:1 C4:5
    `),
  },
  // "We Wish You a Merry Christmas" — tradicional inglesa, séc. XVI.
  "feliz-natal": {
    beat: 0.34,
    melody: parse(`
      D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1
      A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1
      B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5
      E4:1 A4:1 F#4:1 G4:2 D4:1
      G4:1 G4:1 G4:1 F#4:2 F#4:1 G4:1 F#4:1 E4:1 D4:2 A4:1
      B4:1 A4:1 G4:1 D5:1 D4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:3
    `),
  },
};

mkdirSync(join(publicDir, "music"), { recursive: true });
for (const [slug, { beat, melody }] of Object.entries(SONGS)) {
  const twice = [...melody, ["-", 2], ...melody];
  writeFileSync(join(publicDir, "music", `${slug}.wav`), toWav(render(twice, beat)));
  console.log(`música: public/music/${slug}.wav`);
}

/* ------------------------------ Fotos ------------------------------ */

const SCENES = [
  { sky: "#1c3a5e", ground: "#f4f8fb", accent: "#f0b040", kind: "tree" },
  { sky: "#7a1420", ground: "#fbefe2", accent: "#f0b040", kind: "gift" },
  { sky: "#104030", ground: "#eef5ea", accent: "#a01020", kind: "star" },
  { sky: "#503020", ground: "#f6ead8", accent: "#f0b040", kind: "heart" },
  { sky: "#2d2a5a", ground: "#f2f0fa", accent: "#f0b040", kind: "tree" },
  { sky: "#8a3a12", ground: "#fff4e0", accent: "#a01020", kind: "gift" },
];

const FIGURES = {
  tree: `<path d="M200 96 L262 190 H138 Z M200 150 L282 262 H118 Z" fill="#208050"/><rect x="186" y="262" width="28" height="34" fill="#805020"/>`,
  gift: `<rect x="140" y="176" width="120" height="110" rx="10" fill="#a01020"/><rect x="190" y="176" width="20" height="110" fill="#f0b040"/><rect x="128" y="154" width="144" height="34" rx="10" fill="#a01020"/><path d="M200 154 Q160 100 142 128 Q140 152 200 154 Q260 152 258 128 Q240 100 200 154Z" fill="#f0b040"/>`,
  star: `<path d="M200 110 L226 176 L296 180 L242 224 L260 292 L200 254 L140 292 L158 224 L104 180 L174 176 Z" fill="#f0b040"/>`,
  heart: `<path d="M200 290 C90 210 110 120 170 120 C190 120 200 136 200 150 C200 136 210 120 230 120 C290 120 310 210 200 290Z" fill="#a01020"/>`,
};

mkdirSync(join(publicDir, "demo"), { recursive: true });
SCENES.forEach((scene, index) => {
  const flakes = Array.from({ length: 22 }, (_, i) => {
    const x = (i * 97 + index * 31) % 400;
    const y = (i * 53 + index * 17) % 300;
    return `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#fff" opacity="${0.5 + (i % 4) / 10}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
<rect width="400" height="400" fill="${scene.sky}"/>
<circle cx="320" cy="76" r="34" fill="${scene.accent}" opacity=".9"/>
${flakes}
<path d="M0 300 Q100 262 200 292 T400 280 V400 H0Z" fill="${scene.ground}"/>
${FIGURES[scene.kind]}
</svg>`;
  writeFileSync(join(publicDir, "demo", `foto-${index + 1}.svg`), svg);
});
console.log(`fotos: public/demo/foto-1.svg … foto-${SCENES.length}.svg`);
