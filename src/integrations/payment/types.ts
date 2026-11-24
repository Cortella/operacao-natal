/**
 * Contrato que todo gateway de pagamento precisa cumprir.
 * O restante da aplicação (pedidos, webhook, publicação) só conhece esta interface;
 * para integrar um gateway, implemente-a e registre em ./index.ts.
 */

export type PaymentMethod = "PIX" | "CREDIT_CARD";

export type PaymentStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "REFUNDED" | "EXPIRED";

export type ChargeInput = {
  /** Id do pedido; deve ser enviado ao gateway como referência externa. */
  orderId: string;
  /** Valor em centavos, já calculado no servidor. */
  amountCents: number;
  description: string;
  method: PaymentMethod;
  payer: { name: string; email: string };
  /** Endereço que o gateway deve chamar ao mudar o status. */
  notificationUrl: string;
  /** Para onde o gateway devolve o comprador em fluxos com redirecionamento. */
  returnUrl: string;
};

export type ChargeResult = {
  providerPaymentId: string;
  status: PaymentStatus;
  statusDetail?: string;
  /** Dados do PIX, quando o método é PIX. */
  pix?: { code: string; qrCodeBase64?: string; expiresAt?: Date };
  /** Checkout hospedado pelo gateway (comum em cartão). O comprador é levado para lá. */
  redirectUrl?: string;
};

export type ProviderPayment = {
  status: PaymentStatus;
  statusDetail?: string;
  /** Valor efetivamente cobrado, para conferir com o pedido. */
  amountCents: number;
};

export type WebhookRequest = {
  headers: Headers;
  /** Corpo exatamente como chegou; a assinatura é calculada sobre ele. */
  rawBody: string;
  url: URL;
};

export type WebhookEvent = {
  /** Identificador único da notificação, usado para não processar duas vezes. */
  eventKey: string;
  type: string;
  /** Cobrança a que a notificação se refere; null quando o evento não é de pagamento. */
  providerPaymentId: string | null;
  payload: unknown;
};

/** A notificação não veio do gateway (assinatura ausente ou inválida). */
export class InvalidWebhookError extends Error {}

/** O gateway recusou ou não respondeu; a mensagem pode ser mostrada ao comprador. */
export class PaymentProviderError extends Error {}

export interface PaymentProvider {
  /** Nome estável, gravado em Payment.provider e usado na URL do webhook. */
  readonly name: string;
  readonly methods: readonly PaymentMethod[];
  /** Aviso exibido no checkout (ex.: ambiente de testes). */
  readonly notice?: string;

  createCharge(input: ChargeInput): Promise<ChargeResult>;

  /** Consulta o estado atual da cobrança direto no gateway. */
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;

  /**
   * Valida a assinatura e interpreta a notificação.
   * Deve lançar InvalidWebhookError quando a assinatura não confere.
   */
  parseWebhook(request: WebhookRequest): Promise<WebhookEvent>;
}
