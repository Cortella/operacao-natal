# Pagamentos

## Situação atual

Todo o fluxo de pagamento está pronto e testado, **menos a ligação com um gateway real**, que ainda não foi escolhido.

| Parte                                                                              | Situação  |
| ---------------------------------------------------------------------------------- | --------- |
| Pedido com valor calculado no servidor, promoção e cupom                           | Pronto    |
| Checkout com PIX (QR code e copia-e-cola) e suporte a redirecionamento para cartão | Pronto    |
| Webhook com validação de assinatura e idempotência                                 | Pronto    |
| Nova consulta ao gateway antes de aprovar, com conferência do valor                | Pronto    |
| Publicação da página, link exclusivo e compartilhamento                            | Pronto    |
| Histórico de transações (`Payment` e `PaymentEvent`)                               | Pronto    |
| Integração com o gateway de produção                                               | **Falta** |

Enquanto `PAYMENT_PROVIDER` estiver vazio, o checkout mostra "Pagamento indisponível no momento" e nenhuma página é publicada.

## Gateway de testes local

Com `PAYMENT_PROVIDER="teste-local"` a aplicação usa um gateway de testes que **não cobra ninguém**. Ele existe para exercitar o caminho de produção (pedido, webhook assinado, publicação) sem depender de terceiros.

- Só é habilitado quando `APP_URL` aponta para `localhost`. Em qualquer outro endereço os pagamentos ficam desabilitados.
- O checkout mostra um aviso de ambiente de testes e o código PIX gerado não é pagável.
- A cobrança só muda de estado quando chega um webhook assinado com `PAYMENT_WEBHOOK_SECRET`.

Para confirmar a cobrança pendente mais recente:

```bash
npm run pagamento:teste                # aprova
npm run pagamento:teste -- recusado    # recusa
npm run pagamento:teste -- estornado   # estorna (tira a página do ar)
```

Se o servidor não estiver na porta 3000, ajuste `APP_URL` no `.env`.

## Como integrar o gateway de produção

1. Crie `src/integrations/payment/<nome>.ts` implementando a interface `PaymentProvider` de [types.ts](../src/integrations/payment/types.ts):
   - `createCharge`: cria a cobrança no gateway. Envie `orderId` como referência externa e `notificationUrl` como endereço de notificação. Devolva o id da cobrança e, no PIX, o código copia-e-cola (o QR code é gerado pela aplicação se o gateway não enviar a imagem). Para cartão em checkout hospedado, devolva `redirectUrl`.
   - `getPayment`: consulta a cobrança no gateway e devolve status e valor pago em centavos.
   - `parseWebhook`: valida a assinatura sobre o corpo bruto e devolve o id do evento e o id da cobrança. Lance `InvalidWebhookError` se a assinatura não conferir.
2. Registre o gateway em [index.ts](../src/integrations/payment/index.ts), em `getPaymentProvider`.
3. Configure no ambiente: `PAYMENT_PROVIDER="<nome>"`, `PAYMENT_ACCESS_TOKEN` e `PAYMENT_WEBHOOK_SECRET`.
4. No painel do gateway, cadastre o webhook: `https://<seu-domínio>/api/webhooks/pagamento/<nome>`.
5. Rode o fluxo no ambiente de testes do gateway antes de usar credenciais de produção.

Nada fora dessa pasta precisa mudar. O arquivo [local-test.ts](../src/integrations/payment/local-test.ts) serve de exemplo completo.

## Regras de segurança já aplicadas

- O valor é sempre calculado no servidor; o navegador nunca informa quanto pagar.
- Voltar para a página de sucesso não aprova nada: o link só aparece quando a página está publicada no banco.
- O conteúdo do webhook não é tomado como verdade. Depois de validar a assinatura, a aplicação consulta o gateway de novo.
- Pagamento aprovado com valor diferente do pedido não publica a página e fica marcado para conferência.
- A mesma notificação entregue duas vezes é processada uma única vez.
- Estorno tira a página do ar.
