import type { Metadata } from "next";
import { Suspense } from "react";
import { UserMenu, UserMenuFallback } from "@/components/auth/UserMenu";
import {
  ChristmasCard,
  ChristmasFooter,
  ChristmasHeader,
  Container,
  ElfCharacter,
  LoadingAnimation,
  PrimaryButton,
  WoodBackground,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Minhas páginas" };

async function Greeting() {
  const user = await requireUser("/minhas-paginas");
  return (
    <ChristmasCard className="flex flex-col items-center text-center">
      <ElfCharacter pose="gift" size={120} />
      <h1 className="text-primary mt-2 text-3xl">Olá, {user.name.split(" ")[0]}!</h1>
      <p className="mt-2 max-w-md">
        Você ainda não criou nenhuma página. Que tal preparar um presente agora?
      </p>
      <PrimaryButton href="/criar" size="lg" className="mt-6">
        Criar minha página de Natal
      </PrimaryButton>
    </ChristmasCard>
  );
}

export default function MyPagesPage() {
  return (
    <>
      <ChristmasHeader
        actions={
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        }
      />
      <WoodBackground as="main" lights className="flex-1 py-16">
        <Container size="md">
          <Suspense fallback={<LoadingAnimation />}>
            <Greeting />
          </Suspense>
        </Container>
      </WoodBackground>
      <ChristmasFooter />
    </>
  );
}
