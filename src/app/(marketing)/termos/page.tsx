import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, Operator, legalIdentity } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras para criar e compartilhar páginas de Natal na Oficina do Noel.",
};

export default function TermsPage() {
  const identity = legalIdentity();
  return (
    <LegalPage title="Termos de uso" updatedAt="24 de novembro de 2026">
      <p>
        Estes termos regulam o uso da Oficina do Noel, operada por <Operator identity={identity} />.
        Ao criar uma conta você declara que leu e concorda com eles e com a{" "}
        <Link href="/privacidade" className="font-bold underline">
          política de privacidade
        </Link>
        .
      </p>

      <h2>O serviço</h2>
      <p>
        A plataforma permite montar uma página de Natal personalizada, com textos, fotos e música, e
        publicá-la em um link exclusivo para presentear alguém. Você pode montar e visualizar a
        página gratuitamente; a publicação acontece depois da confirmação do pagamento.
      </p>

      <h2>Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais, ou contar com a autorização de um responsável.</li>
        <li>Informe dados verdadeiros e mantenha sua senha em segredo.</li>
        <li>Você é responsável pelo que for feito com a sua conta.</li>
      </ul>

      <h2>Pagamento</h2>
      <ul>
        <li>O preço é o exibido no momento da compra, em pagamento único.</li>
        <li>A página é publicada automaticamente quando o pagamento é confirmado.</li>
        <li>
          Por se tratar de compra feita pela internet, você pode desistir em até 7 dias após a
          compra, com reembolso integral, conforme o Código de Defesa do Consumidor. Com o
          reembolso, a página sai do ar. Peça pelo e-mail <ContactEmail identity={identity} />.
        </li>
      </ul>

      <h2>O conteúdo é seu, e a responsabilidade também</h2>
      <p>
        Os textos, fotos e músicas que você envia continuam sendo seus. Você nos autoriza a
        armazená-los e exibi-los apenas para fazer a sua página funcionar. Ao enviar conteúdo, você
        declara que:
      </p>
      <ul>
        <li>tem o direito de usar as fotos e a autorização das pessoas que aparecem nelas;</li>
        <li>
          tem o direito de usar a música enviada (autoria própria, domínio público ou licença);
        </li>
        <li>o conteúdo não viola a lei nem direitos de outras pessoas.</li>
      </ul>

      <h2>O que não é permitido</h2>
      <ul>
        <li>Conteúdo ilegal, ofensivo, discriminatório, de assédio ou que exponha alguém.</li>
        <li>Conteúdo sexual envolvendo menores, em qualquer hipótese.</li>
        <li>Usar a página para golpes, spam ou para se passar por outra pessoa ou empresa.</li>
        <li>Tentar invadir, sobrecarregar ou burlar os mecanismos da plataforma.</li>
      </ul>
      <p>
        Podemos tirar do ar páginas que descumpram estas regras e, em casos graves, encerrar a
        conta. Denúncias podem ser enviadas para <ContactEmail identity={identity} />.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        Trabalhamos para manter as páginas sempre no ar, mas o serviço pode passar por manutenções e
        falhas pontuais. Se a página tiver prazo de validade, ele é informado no momento da
        publicação.
      </p>

      <h2>Encerramento</h2>
      <p>
        Você pode excluir suas páginas e sua conta quando quiser, em{" "}
        <Link href="/conta" className="font-bold underline">
          Minha conta
        </Link>
        . Com a exclusão, os links compartilhados deixam de funcionar.
      </p>

      <h2>Alterações e foro</h2>
      <p>
        Estes termos podem ser atualizados; a data no topo indica a versão em vigor. Aplica-se a
        legislação brasileira, e fica assegurado ao consumidor o foro do seu domicílio.
      </p>
    </LegalPage>
  );
}
