import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origem (esquema + host) de uma URL de ambiente, ou null se ausente/inválida. */
function origin(value: string | undefined): string | null {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

// Fotos e músicas vêm do storage; o envio de música vai direto para ele.
const storageOrigins = [
  ...new Set([origin(process.env.S3_PUBLIC_URL), origin(process.env.S3_ENDPOINT)]),
].filter((value): value is string => value !== null);
const storage = storageOrigins.join(" ");

/**
 * Política de segurança de conteúdo. É fixa (sem nonce) para as páginas poderem
 * ser pré-renderizadas; por isso scripts e estilos inline são permitidos, e todo
 * o resto fica restrito ao próprio site e ao storage.
 * Um gateway com checkout embutido pode exigir liberar o domínio dele aqui.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`,
  `media-src 'self' ${storage}`,
  `connect-src 'self' ${storage}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .map((directive) => directive.trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Habilita forbidden()/unauthorized() e as telas forbidden.tsx/unauthorized.tsx.
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
