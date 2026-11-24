import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, Operator, legalIdentity } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Oficina do Noel trata os dados pessoais de quem cria e recebe presentes.",
};

export default function PrivacyPage() {
  const identity = legalIdentity();
  return (
    <LegalPage title="Política de privacidade" updatedAt="24 de novembro de 2026">
      <p>
        Esta política explica quais dados pessoais a Oficina do Noel trata, para quê, por quanto
        tempo e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018).
      </p>

      <h2>Quem é o responsável</h2>
      <p>
        A plataforma é operada por <Operator identity={identity} />, que é o controlador dos dados.
        Para qualquer assunto sobre privacidade, escreva para <ContactEmail identity={identity} />.
      </p>

      <h2>Dados que tratamos</h2>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail e senha. A senha é guardada apenas na forma de
          código irreversível (hash); ninguém da equipe consegue lê-la.
        </li>
        <li>
          <strong>Conteúdo das páginas:</strong> nomes de quem envia e de quem recebe, textos, fotos
          e músicas que você escolhe ou envia.
        </li>
        <li>
          <strong>Compras:</strong> valor, cupom usado, forma e situação do pagamento. Dados de
          cartão e de conta bancária são tratados diretamente pelo provedor de pagamentos e não
          passam pelos nossos servidores.
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP e registros de acesso, usados para segurança
          e prevenção a fraudes (por exemplo, limitar tentativas de login).
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Criar sua conta e permitir que você monte, edite e publique suas páginas.</li>
        <li>Processar o pagamento e liberar o link do presente.</li>
        <li>Enviar mensagens necessárias ao serviço, como a recuperação de senha.</li>
        <li>Proteger a plataforma contra abusos e cumprir obrigações legais.</li>
      </ul>
      <p>
        As bases legais são a execução do contrato com você, o cumprimento de obrigações legais e o
        legítimo interesse em manter o serviço seguro. Não vendemos seus dados nem os usamos para
        publicidade de terceiros.
      </p>

      <h2>Fotos e dados de outras pessoas</h2>
      <p>
        Ao criar uma página você pode incluir o nome e fotos de outras pessoas. Você é responsável
        por ter autorização para isso. As fotos enviadas são regravadas sem os metadados originais
        (como a localização registrada pelo celular).
      </p>

      <h2>Quem pode ver sua página</h2>
      <p>
        A página publicada abre para qualquer pessoa que tenha o link. O endereço não é listado em
        buscadores. Enquanto é rascunho, só você a vê. As fotos ficam em endereços aleatórios, que
        não podem ser deduzidos; quem tiver o endereço exato de uma foto consegue abri-la.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Usamos fornecedores para operar o serviço: hospedagem do site e do banco de dados,
        armazenamento de arquivos, envio de e-mails e processamento de pagamentos. Eles tratam os
        dados em nosso nome, apenas para essas finalidades. Alguns podem armazenar dados fora do
        Brasil, com as garantias previstas na lei.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos um único cookie, estritamente necessário, para manter você conectado. Não usamos
        cookies de publicidade nem de rastreamento.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Conta e páginas:</strong> enquanto a conta existir. Você pode excluir uma página
          ou a conta inteira a qualquer momento.
        </li>
        <li>
          <strong>Registros de compras:</strong> pelo prazo exigido pela legislação fiscal e de
          defesa do consumidor, mesmo após a exclusão da conta. Nesse caso o registro deixa de
          conter seu nome e e-mail.
        </li>
        <li>
          <strong>Registros de segurança:</strong> pelo tempo necessário para investigar abusos.
        </li>
      </ul>

      <h2>Seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>
          baixar uma cópia dos seus dados e excluir sua conta em{" "}
          <Link href="/conta" className="font-bold underline">
            Minha conta
          </Link>
          ;
        </li>
        <li>corrigir os textos e fotos das suas páginas no editor;</li>
        <li>tirar uma página do ar ou excluí-la em “Minhas páginas”;</li>
        <li>
          pedir informações, correção, anonimização ou oposição ao tratamento pelo e-mail{" "}
          <ContactEmail identity={identity} />.
        </li>
      </ul>
      <p>
        Se você recebeu um presente e quer que seu nome ou sua foto sejam removidos, escreva para o
        mesmo e-mail informando o link da página.
      </p>
      <p>
        Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Mudanças nesta política</h2>
      <p>
        Se a política mudar de forma relevante, avisaremos na plataforma. A data no topo indica a
        versão em vigor.
      </p>
    </LegalPage>
  );
}
