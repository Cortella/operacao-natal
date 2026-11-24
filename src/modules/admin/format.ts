const TIME_ZONE = "America/Sao_Paulo";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

/** 24/11/2026, 18:30 (horário de Brasília) */
export const formatDateTime = (date: Date | null | undefined) =>
  date ? dateTime.format(date) : "—";

/** Valor para <input type="datetime-local">, no horário de Brasília. */
export function toLocalInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return parts.replace(" ", "T");
}

/** 1990 -> "19,90", para campos de valor. */
export const centsToInput = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",");

type Badge = { label: string; className: string };

export const PAGE_STATUS: Record<string, Badge> = {
  DRAFT: { label: "Rascunho", className: "badge badge-gold" },
  PENDING_PAYMENT: { label: "Aguardando pagamento", className: "badge badge-gold" },
  PUBLISHED: { label: "Publicada", className: "badge badge-green" },
  DISABLED: { label: "Desativada", className: "badge" },
};

export const ORDER_STATUS: Record<string, Badge> = {
  PENDING: { label: "Pendente", className: "badge badge-gold" },
  PAID: { label: "Pago", className: "badge badge-green" },
  CANCELED: { label: "Cancelado", className: "badge" },
  REFUNDED: { label: "Estornado", className: "badge badge-red" },
};

export const PAYMENT_STATUS: Record<string, Badge> = {
  PENDING: { label: "Pendente", className: "badge badge-gold" },
  APPROVED: { label: "Aprovado", className: "badge badge-green" },
  REJECTED: { label: "Recusado", className: "badge badge-red" },
  CANCELED: { label: "Cancelado", className: "badge" },
  REFUNDED: { label: "Estornado", className: "badge badge-red" },
  EXPIRED: { label: "Expirado", className: "badge" },
};

export const METHOD_LABEL: Record<string, string> = { PIX: "PIX", CREDIT_CARD: "Cartão" };
