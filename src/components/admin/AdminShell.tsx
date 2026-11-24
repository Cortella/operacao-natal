import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { UserMenu, UserMenuFallback } from "@/components/auth/UserMenu";
import {
  ChristmasHeader,
  Container,
  ErrorMessage,
  LoadingAnimation,
  SuccessMessage,
  WoodBackground,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/paginas", label: "Páginas" },
  { href: "/admin/vendas", label: "Vendas" },
  { href: "/admin/comercial", label: "Preço" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/musicas", label: "Músicas" },
  { href: "/admin/modelos", label: "Modelos" },
  { href: "/admin/conteudo", label: "Textos" },
];

export type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Confere o papel e mostra o retorno da última ação (?ok= ou ?erro=). */
async function Gate({
  searchParams,
  children,
}: {
  searchParams?: AdminSearchParams;
  children: ReactNode;
}) {
  await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const ok = firstParam(params.ok);
  const error = firstParam(params.erro);
  return (
    <>
      {ok && <SuccessMessage compact title={ok.slice(0, 200)} className="mb-5" />}
      {error && <ErrorMessage compact title={error.slice(0, 200)} className="mb-5" />}
      {children}
    </>
  );
}

/**
 * Moldura do painel: mesma identidade da plataforma, com navegação entre as áreas.
 * O conteúdo só é renderizado depois de confirmar que a sessão é de administrador.
 */
export function AdminShell({
  title,
  current,
  searchParams,
  children,
}: {
  title: string;
  /** href da área atual, para destacar na navegação. */
  current: string;
  searchParams?: AdminSearchParams;
  children: ReactNode;
}) {
  return (
    <>
      <ChristmasHeader
        actions={
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        }
      />
      <WoodBackground as="main" className="flex-1 py-8">
        <Container>
          <p className="tag">Painel da Oficina</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1>

          <nav
            aria-label="Áreas do painel"
            className="-mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
          >
            <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.href === current ? "page" : undefined}
                    className={cn(
                      "font-display block rounded-full px-4 py-2 font-medium whitespace-nowrap transition-colors",
                      item.href === current
                        ? "bg-gold text-text-dark"
                        : "bg-wood-deep text-text-light hover:bg-wood-medium",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6">
            <Suspense fallback={<LoadingAnimation />}>
              <Gate searchParams={searchParams}>{children}</Gate>
            </Suspense>
          </div>
        </Container>
      </WoodBackground>
    </>
  );
}

/** Rolagem horizontal para tabelas largas no celular. */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="shadow-soft overflow-x-auto rounded-xl">{children}</div>;
}

export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="text-text-light mt-4 flex items-center justify-between">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn btn-outline btn-sm">
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="font-display">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className="btn btn-outline btn-sm">
          Próxima →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
