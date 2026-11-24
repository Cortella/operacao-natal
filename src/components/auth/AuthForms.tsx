"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { ErrorMessage, FormInput, PrimaryButton, SuccessMessage } from "@/components/ui";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthFormState,
} from "@/modules/auth/actions";

const initial: AuthFormState = {};

function FormError({ state }: { state: AuthFormState }) {
  if (!state.errors?.form) return null;
  return <ErrorMessage compact title={state.errors.form} />;
}

/** Mantém o destino pós-login (?next=) ao trocar entre entrar e cadastrar. */
function useNext() {
  const next = useSearchParams().get("next") ?? "";
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  return { next, suffix };
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const { next, suffix } = useNext();

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormInput
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <FormInput
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors?.password}
      />
      <PrimaryButton type="submit" fullWidth size="lg" loading={pending}>
        Entrar
      </PrimaryButton>
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Link href="/esqueci-senha" className="text-primary font-bold underline underline-offset-4">
          Esqueci minha senha
        </Link>
        <p>
          Ainda não tem conta?{" "}
          <Link
            href={`/cadastro${suffix}`}
            className="text-primary font-bold underline underline-offset-4"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const { next, suffix } = useNext();

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormInput
        label="Seu nome"
        name="name"
        autoComplete="name"
        required
        maxLength={80}
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <FormInput
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        hint="É por ele que você entra para editar sua página."
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <FormInput
        label="Crie uma senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Pelo menos 8 caracteres."
        error={state.errors?.password}
      />
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="accent-elf-green mt-1 h-5 w-5 shrink-0"
            aria-describedby={state.errors?.acceptTerms ? "accept-terms-error" : undefined}
          />
          <span className="text-sm">
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="font-bold underline">
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="font-bold underline">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {state.errors?.acceptTerms && (
          <p id="accept-terms-error" className="field-error" role="alert">
            {state.errors.acceptTerms}
          </p>
        )}
      </div>
      <PrimaryButton type="submit" fullWidth size="lg" loading={pending}>
        Criar minha conta
      </PrimaryButton>
      <p className="pt-2 text-center">
        Já tem conta?{" "}
        <Link
          href={`/entrar${suffix}`}
          className="text-primary font-bold underline underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  if (state.success) {
    return (
      <div className="space-y-4">
        <SuccessMessage compact title="Confira seu e-mail">
          {state.success}
        </SuccessMessage>
        <PrimaryButton href="/entrar" fullWidth>
          Voltar para entrar
        </PrimaryButton>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <FormInput
        label="E-mail da sua conta"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <PrimaryButton type="submit" fullWidth size="lg" loading={pending}>
        Enviar link
      </PrimaryButton>
      <p className="pt-2 text-center">
        <Link href="/entrar" className="text-primary font-bold underline underline-offset-4">
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const token = useSearchParams().get("token") ?? "";

  if (!token) {
    return (
      <div className="space-y-4">
        <ErrorMessage compact title="Este link é inválido">
          Peça um novo link para criar sua senha.
        </ErrorMessage>
        <PrimaryButton href="/esqueci-senha" fullWidth>
          Pedir novo link
        </PrimaryButton>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <FormInput
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Pelo menos 8 caracteres."
        error={state.errors?.password}
      />
      <PrimaryButton type="submit" fullWidth size="lg" loading={pending}>
        Salvar nova senha
      </PrimaryButton>
      {state.errors?.form && (
        <p className="text-center">
          <Link
            href="/esqueci-senha"
            className="text-primary font-bold underline underline-offset-4"
          >
            Pedir novo link
          </Link>
        </p>
      )}
    </form>
  );
}
