import Link from "next/link";
import type { ReactNode } from "react";
import { HatLogo } from "./Decorations";
import { Container } from "./Surfaces";

export type NavLink = { href: string; label: string };

/** Marca da plataforma. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="Oficina do Noel — início">
      <HatLogo size={38} />
      <span className="font-display text-text-light text-xl leading-none font-semibold">
        Oficina <span className="text-gold">do Noel</span>
      </span>
    </Link>
  );
}

/** Cabeçalho global: marca, navegação e ações à direita. */
export function ChristmasHeader({
  links = [],
  actions,
}: {
  links?: NavLink[];
  actions?: ReactNode;
}) {
  return (
    <header className="bg-wood-deep/95 sticky top-0 z-40 border-b-4 border-black/25 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
        <Logo />
        {links.length > 0 && (
          <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display text-text-light hover:text-gold transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </Container>
    </header>
  );
}

const FOOTER_LINKS: NavLink[] = [
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos de uso" },
];

/** Rodapé global. */
export function ChristmasFooter({ links = FOOTER_LINKS }: { links?: NavLink[] }) {
  return (
    <footer className="bg-wood-deep text-text-light border-t-4 border-black/25">
      <Container className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Logo />
          <p className="mt-2 text-sm opacity-75">Presentes digitais feitos com carinho.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gold underline-offset-4">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
