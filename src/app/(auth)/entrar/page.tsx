import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthShell title="Que bom ver você!" subtitle="Entre para criar ou editar sua página de Natal.">
      <LoginForm />
    </AuthShell>
  );
}
