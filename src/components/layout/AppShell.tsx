import { Suspense, type ReactNode } from "react";
import { UserMenu, UserMenuFallback } from "@/components/auth/UserMenu";
import {
  ChristmasFooter,
  ChristmasHeader,
  Container,
  LoadingAnimation,
  WoodBackground,
} from "@/components/ui";

/**
 * Moldura das áreas logadas: cabeçalho com a conta, parede de madeira e rodapé.
 * O conteúdo fica em um <Suspense> porque sempre depende da sessão.
 */
export function AppShell({
  children,
  size = "lg",
  footer = true,
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: boolean;
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
      <WoodBackground as="main" className="flex-1 py-8 sm:py-12">
        <Container size={size}>
          <Suspense fallback={<LoadingAnimation />}>{children}</Suspense>
        </Container>
      </WoodBackground>
      {footer && <ChristmasFooter />}
    </>
  );
}
