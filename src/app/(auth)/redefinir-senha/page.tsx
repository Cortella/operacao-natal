import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Nova senha",
  // O endereço carrega o token: não deve ser indexado nem enviado como referência.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Crie uma nova senha" pose="idle">
      <ResetPasswordForm />
    </AuthShell>
  );
}
