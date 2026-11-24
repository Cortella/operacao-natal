import { ImageResponse } from "next/og";

export const alt = "Oficina do Noel — páginas de Natal personalizadas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem exibida quando um link da plataforma é compartilhado (WhatsApp, redes sociais). */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#503020",
        backgroundImage:
          "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 100px, rgba(20,10,5,0.55) 100px, rgba(20,10,5,0.55) 105px)",
        color: "#FFF9EF",
        fontFamily: "sans-serif",
      }}
    >
      <svg width="240" height="240" viewBox="0 0 200 200">
        <rect x="32" y="92" width="136" height="92" rx="10" fill="#A01020" />
        <rect x="88" y="92" width="24" height="92" fill="#F0B040" />
        <rect x="22" y="66" width="156" height="32" rx="10" fill="#A01020" />
        <rect x="88" y="66" width="24" height="32" fill="#F0B040" />
        <path
          d="M100 66 Q62 14 42 42 Q36 66 100 66 Q164 66 158 42 Q138 14 100 66 Z"
          fill="#F0B040"
        />
      </svg>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 20 }}>
        Oficina <span style={{ color: "#F0B040", marginLeft: 22 }}>do Noel</span>
      </div>
      <div style={{ display: "flex", fontSize: 38, marginTop: 14 }}>
        Presentes digitais de Natal
      </div>
    </div>,
    size,
  );
}
