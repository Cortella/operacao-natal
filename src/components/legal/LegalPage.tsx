import type { ReactNode } from "react";
import {
  ChristmasCard,
  ChristmasFooter,
  ChristmasHeader,
  Container,
  ErrorMessage,
  WoodBackground,
} from "@/components/ui";
import { env } from "@/lib/env";

export type LegalIdentity = { name: string; document: string | null; email: string } | null;

/** Dados de quem opera a plataforma, vindos do ambiente. */
export function legalIdentity(): LegalIdentity {
  const { LEGAL_NAME, LEGAL_DOCUMENT, LEGAL_EMAIL } = env();
  if (!LEGAL_NAME || !LEGAL_EMAIL) return null;
  return { name: LEGAL_NAME, document: LEGAL_DOCUMENT ?? null, email: LEGAL_EMAIL };
}

/** Moldura das páginas legais: texto longo em cartão creme, fácil de ler no celular. */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const identity = legalIdentity();
  return (
    <>
      <ChristmasHeader />
      <WoodBackground as="main" className="flex-1 py-10">
        <Container size="md">
          <ChristmasCard>
            <h1 className="text-primary text-3xl sm:text-4xl">{title}</h1>
            <p className="mt-1 text-sm opacity-70">Última atualização: {updatedAt}</p>
            {!identity && (
              <ErrorMessage compact title="Documento incompleto" className="mt-4">
                Os dados do responsável pela plataforma (LEGAL_NAME e LEGAL_EMAIL) ainda não foram
                configurados.
              </ErrorMessage>
            )}
            <div className="[&_h2]:text-primary mt-6 space-y-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
              {children}
            </div>
          </ChristmasCard>
        </Container>
      </WoodBackground>
      <ChristmasFooter />
    </>
  );
}

/** "Fulano Ltda. (CNPJ ...)" ou um aviso visível quando não configurado. */
export function Operator({ identity }: { identity: LegalIdentity }) {
  if (!identity) return <strong>[responsável ainda não informado]</strong>;
  return (
    <strong>
      {identity.name}
      {identity.document ? ` (${identity.document})` : ""}
    </strong>
  );
}

export function ContactEmail({ identity }: { identity: LegalIdentity }) {
  if (!identity) return <strong>[e-mail de contato ainda não informado]</strong>;
  return (
    <a href={`mailto:${identity.email}`} className="font-bold underline">
      {identity.email}
    </a>
  );
}
