import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES, SESSION_COOKIE } from "@/modules/auth/constants";

/**
 * Barreira otimista: visitantes sem cookie de sessão não chegam às áreas restritas.
 * A validade da sessão e as permissões são conferidas no banco, em cada página,
 * action e rota (ver src/lib/auth.ts). Este arquivo não substitui essas checagens.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    // Quem chega pelo botão "Criar minha página" quase sempre ainda não tem conta.
    const entry = pathname.startsWith("/criar") ? "/cadastro" : "/entrar";
    const login = new URL(entry, request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/criar/:path*",
    "/checkout/:path*",
    "/minhas-paginas/:path*",
    "/conta/:path*",
    "/admin/:path*",
  ],
};
