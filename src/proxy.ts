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
    const login = new URL("/entrar", request.url);
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
