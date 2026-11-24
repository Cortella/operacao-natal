import { Suspense, type ReactNode } from "react";
import {
  ChristmasCard,
  Container,
  ElfCharacter,
  LoadingAnimation,
  Logo,
  WoodBackground,
  type ElfPose,
} from "@/components/ui";

/** Moldura das telas de conta: parede de madeira, duende e cartão central. */
export function AuthShell({
  title,
  subtitle,
  pose = "wave",
  children,
}: {
  title: string;
  subtitle?: string;
  pose?: ElfPose;
  children: ReactNode;
}) {
  return (
    <WoodBackground as="main" lights snow className="flex flex-1 flex-col py-12">
      <Container size="sm" className="flex flex-1 flex-col items-center justify-center">
        <div className="mt-4 mb-2">
          <Logo />
        </div>
        <ElfCharacter pose={pose} size={110} className="relative z-10 -mb-5" />
        <ChristmasCard className="animate-rise w-full pt-9">
          <h1 className="text-primary text-center text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-center">{subtitle}</p>}
          <div className="mt-6">
            {/* Os formulários leem a URL (?next=, ?token=), o que só existe na requisição. */}
            <Suspense fallback={<LoadingAnimation label="Abrindo a oficina…" />}>
              {children}
            </Suspense>
          </div>
        </ChristmasCard>
      </Container>
    </WoodBackground>
  );
}
