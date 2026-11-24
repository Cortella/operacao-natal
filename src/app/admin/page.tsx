import type { Metadata } from "next";
import { Suspense } from "react";
import { UserMenu, UserMenuFallback } from "@/components/auth/UserMenu";
import {
  ChristmasCard,
  ChristmasHeader,
  Container,
  LoadingAnimation,
  WoodBackground,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

async function Welcome() {
  const admin = await requireAdmin();
  return (
    <ChristmasCard>
      <h1 className="text-primary text-3xl">Painel da Oficina</h1>
      <p className="mt-2">
        Você entrou como {admin.email}. O dashboard, as páginas e as vendas chegam no Step 9.
      </p>
    </ChristmasCard>
  );
}

export default function AdminPage() {
  return (
    <>
      <ChristmasHeader
        actions={
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        }
      />
      <WoodBackground as="main" className="flex-1 py-16">
        <Container size="md">
          <Suspense fallback={<LoadingAnimation />}>
            <Welcome />
          </Suspense>
        </Container>
      </WoodBackground>
    </>
  );
}
