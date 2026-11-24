import { Container, ErrorMessage, PrimaryButton, WoodBackground } from "@/components/ui";

export default function NotFound() {
  return (
    <WoodBackground as="main" className="flex flex-1 items-center py-16">
      <Container size="sm">
        <ErrorMessage
          title="Não encontramos esta página"
          actions={<PrimaryButton href="/">Voltar ao início</PrimaryButton>}
        >
          O endereço pode ter sido digitado errado ou a página saiu do ar.
        </ErrorMessage>
      </Container>
    </WoodBackground>
  );
}
