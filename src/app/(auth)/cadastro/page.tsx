import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Vamos começar"
      subtitle="Crie sua conta para montar e guardar sua página de Natal."
      pose="gift"
    >
      <RegisterForm />
    </AuthShell>
  );
}
