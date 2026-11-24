import { Container, ErrorMessage, PrimaryButton, WoodBackground } from "@/components/ui";

export default function Forbidden() {
  return (
    <WoodBackground as="main" className="flex flex-1 items-center py-16">
      <Container size="sm">
        <ErrorMessage
          title="Esta porta é só dos duendes"
          actions={<PrimaryButton href="/">Voltar ao início</PrimaryButton>}
        >
          Sua conta não tem permissão para acessar esta área.
        </ErrorMessage>
      </Container>
    </WoodBackground>
  );
}
