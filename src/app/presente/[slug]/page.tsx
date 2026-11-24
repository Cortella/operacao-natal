import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GiftExperience } from "@/components/gift/GiftExperience";
import {
  Container,
  ElfCharacter,
  ErrorMessage,
  LoadingAnimation,
  PrimaryButton,
  WoodBackground,
} from "@/components/ui";
import { getPublishedPage } from "@/modules/pages/queries";
import { slugify } from "@/modules/pages/schema";

type Params = Pick<PageProps<"/presente/[slug]">, "params">;

/** Só consulta o banco para endereços com formato de slug válido. */
async function load(params: Params["params"]) {
  const { slug } = await params;
  if (slug.length > 80 || slugify(slug) !== slug) return { state: "missing" } as const;
  return getPublishedPage(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const result = await load(params);
  // A prévia do link mostra só o nome de quem recebe, nunca a mensagem ou as fotos.
  const title =
    result.state === "ok"
      ? `Um presente de Natal para ${result.page.recipientName}`
      : "Presente de Natal";
  const description = "Abra para ver a surpresa que prepararam para você.";
  return {
    title,
    description,
    // Os presentes são particulares: abrem pelo link, mas não entram em buscadores.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function Gift({ params }: Params) {
  const result = await load(params);
  if (result.state === "missing") notFound();

  if (result.state !== "ok") {
    return (
      <WoodBackground as="main" className="flex flex-1 items-center py-16">
        <Container size="sm">
          <ErrorMessage
            title="Este presente não está disponível"
            actions={<PrimaryButton href="/">Conhecer a Oficina do Noel</PrimaryButton>}
          >
            A página saiu do ar ou ainda não foi publicada. Fale com quem enviou o link para você.
          </ErrorMessage>
        </Container>
      </WoodBackground>
    );
  }

  return <GiftExperience page={result.page} />;
}

function Opening() {
  return (
    <WoodBackground as="main" className="flex flex-1 flex-col items-center justify-center py-16">
      <ElfCharacter pose="gift" size={120} />
      <LoadingAnimation label="Buscando seu presente…" />
    </WoodBackground>
  );
}

export default function GiftPage({ params }: Params) {
  return (
    <Suspense fallback={<Opening />}>
      <Gift params={params} />
    </Suspense>
  );
}
