"use client";

import { useActionState } from "react";
import { ErrorMessage, FormInput, PrimaryButton, SuccessMessage } from "@/components/ui";
import {
  changePasswordAction,
  deleteAccountAction,
  type AccountFormState,
} from "@/modules/account/actions";

const initial: AccountFormState = {};

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error) return <ErrorMessage compact title={state.error} />;
  if (state.success) return <SuccessMessage compact title={state.success} />;
  return null;
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <FormInput
        label="Senha atual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormInput
        label="Nova senha"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Pelo menos 8 caracteres."
      />
      <PrimaryButton type="submit" loading={pending}>
        Alterar senha
      </PrimaryButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <FormInput
        label="Digite sua senha para confirmar"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <PrimaryButton type="submit" loading={pending}>
        Excluir minha conta e meus dados
      </PrimaryButton>
    </form>
  );
}
