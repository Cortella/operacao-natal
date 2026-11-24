/** Nome do cookie de sessão. Fica aqui para ser lido também pelo proxy. */
export const SESSION_COOKIE = "noel_session";

/** Áreas que exigem login. O proxy barra visitantes sem cookie antes de renderizar. */
export const PROTECTED_PREFIXES = ["/criar", "/checkout", "/minhas-paginas", "/conta", "/admin"];

/**
 * Aceita apenas caminhos internos como destino pós-login, para que um link
 * malicioso não use a tela de entrada como trampolim para outro site.
 */
export function safeReturnPath(value: unknown, fallback = "/minhas-paginas"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
