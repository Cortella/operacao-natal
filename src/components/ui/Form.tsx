import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  /** Instrução curta exibida abaixo do campo. */
  hint?: string;
  /** Mensagem de validação; quando presente, o campo fica em estado de erro. */
  error?: string;
  /** Ícone discreto à esquerda do campo. */
  icon?: ReactNode;
  /** Marca o campo como opcional ao lado do label. */
  optional?: boolean;
  className?: string;
};

function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return { fieldId, hintId, errorId, describedBy };
}

function FieldShell({
  fieldId,
  hintId,
  errorId,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps & { fieldId: string; hintId?: string; errorId?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {optional && <span className="ml-1.5 text-sm font-normal opacity-60">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type FormInputProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

/** Campo de texto padrão, com label visível, dica e mensagem de validação. */
export function FormInput({
  label,
  hint,
  error,
  icon,
  optional,
  className,
  id,
  ...input
}: FormInputProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...ids} {...{ label, hint, error, optional, className }}>
      <div className="relative">
        {icon && (
          <span className="text-wood-medium pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
            {icon}
          </span>
        )}
        <input
          id={ids.fieldId}
          className={cn("field-control", icon ? "pl-11" : undefined)}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          {...input}
        />
      </div>
    </FieldShell>
  );
}

type FormTextareaProps = Omit<FieldProps, "icon"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    /** Exibe o contador de caracteres quando há `maxLength`. */
    count?: number;
  };

/** Área de texto para mensagens longas. */
export function FormTextarea({
  label,
  hint,
  error,
  optional,
  className,
  id,
  count,
  rows = 4,
  ...textarea
}: FormTextareaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...ids} {...{ label, hint, error, optional, className }}>
      <textarea
        id={ids.fieldId}
        rows={rows}
        className="field-control resize-y"
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...textarea}
      />
      {textarea.maxLength !== undefined && count !== undefined && (
        <p className="field-hint text-right tabular-nums" aria-hidden="true">
          {count}/{textarea.maxLength}
        </p>
      )}
    </FieldShell>
  );
}

type FormSelectProps = Omit<FieldProps, "icon"> &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

/** Lista de opções no mesmo padrão dos demais campos. */
export function FormSelect({
  label,
  hint,
  error,
  optional,
  className,
  id,
  children,
  ...select
}: FormSelectProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...ids} {...{ label, hint, error, optional, className }}>
      <select
        id={ids.fieldId}
        className="field-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}
