import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ElfCharacter } from "./ElfCharacter";
import { GiftBox } from "./Decorations";

/** Carregamento: um presente quicando enquanto os duendes trabalham. */
export function LoadingAnimation({
  label = "Os duendes estão trabalhando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}
    >
      <div className="flex items-end gap-2">
        {(["red", "gold", "green"] as const).map((color, i) => (
          <GiftBox
            key={color}
            color={color}
            size={44}
            className="animate-bob"
            style={{ animationDelay: `${i * 0.25}s`, animationDuration: "1.2s" }}
          />
        ))}
      </div>
      <p className="font-display text-lg">{label}</p>
    </div>
  );
}

type MessageProps = {
  title: string;
  children?: ReactNode;
  /** Botões ou links de ação exibidos abaixo do texto. */
  actions?: ReactNode;
  /** Versão compacta, sem duende, para avisos dentro de formulários. */
  compact?: boolean;
  className?: string;
};

function Message({
  tone,
  title,
  children,
  actions,
  compact,
  className,
}: MessageProps & { tone: "success" | "error" }) {
  const success = tone === "success";

  if (compact) {
    return (
      <div
        role={success ? "status" : "alert"}
        className={cn(
          "flex items-start gap-3 rounded-2xl border-2 px-4 py-3",
          success
            ? "border-elf-green text-green-dark bg-[#e3f1e7]"
            : "border-danger bg-[#fbe6e3] text-[#7a1712]",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            success ? "bg-elf-green" : "bg-danger",
          )}
        >
          {success ? "✓" : "!"}
        </span>
        <div>
          <p className="font-display font-semibold">{title}</p>
          {children && <div className="text-sm">{children}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "card animate-pop mx-auto flex max-w-md flex-col items-center text-center",
        className,
      )}
    >
      <ElfCharacter pose={success ? "cheer" : "sad"} size={120} />
      <h2 className={cn("mt-2 text-2xl", success ? "text-elf-green" : "text-primary")}>{title}</h2>
      {children && <div className="mt-2">{children}</div>}
      {actions && (
        <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Confirmação de que algo deu certo, com um duende comemorando. */
export function SuccessMessage(props: MessageProps) {
  return <Message tone="success" {...props} />;
}

/** Aviso de erro em linguagem simples, com um duende chateado. */
export function ErrorMessage(props: MessageProps) {
  return <Message tone="error" {...props} />;
}
