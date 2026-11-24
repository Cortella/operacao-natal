import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm, DeleteAccountForm } from "@/components/account/AccountForms";
import { AppShell } from "@/components/layout/AppShell";
import { ChristmasCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Minha conta" };

async function Account() {
  const user = await requireUser("/conta");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Minha conta</h1>

      <ChristmasCard>
        <h2 className="text-primary text-2xl">Seus dados</h2>
        <dl className="mt-3 space-y-1">
          <div>
            <dt className="inline font-bold">Nome: </dt>
            <dd className="inline">{user.name}</dd>
          </div>
          <div>
            <dt className="inline font-bold">E-mail: </dt>
            <dd className="inline break-all">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-4">
          Você pode baixar uma cópia de tudo o que guardamos sobre você: cadastro, páginas, textos,
          endereços das fotos e pedidos.
        </p>
        {/* Link comum (não <Link>): a resposta é um arquivo para download. */}
        <a href="/api/conta/exportar" className="btn btn-secondary mt-4">
          Baixar meus dados
        </a>
        <p className="mt-4 text-sm">
          Saiba como tratamos seus dados na{" "}
          <Link href="/privacidade" className="font-bold underline">
            política de privacidade
          </Link>
          .
        </p>
      </ChristmasCard>

      <ChristmasCard>
        <h2 className="text-primary text-2xl">Alterar senha</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </ChristmasCard>

      <ChristmasCard className="border-danger border-2">
        <h2 className="text-danger text-2xl">Excluir conta</h2>
        <p className="mt-2">
          Suas páginas saem do ar e são apagadas com as fotos, mensagens e músicas enviadas. Os
          links que você compartilhou deixam de funcionar. Esta ação não pode ser desfeita.
        </p>
        <p className="mt-2 text-sm">
          Se você fez compras, guardamos apenas os registros dos pagamentos, sem o seu nome e
          e-mail, pelo prazo exigido por lei.
        </p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </ChristmasCard>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AppShell size="sm">
      <Account />
    </AppShell>
  );
}
