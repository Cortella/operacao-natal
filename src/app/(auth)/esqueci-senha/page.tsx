import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Esqueceu a senha?"
      subtitle="Acontece. Digite seu e-mail e enviamos um link para criar outra."
      pose="idle"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
