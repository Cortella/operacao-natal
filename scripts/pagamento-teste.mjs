// Confirma (ou recusa) uma cobrança do gateway "teste-local" enviando o mesmo tipo
// de webhook assinado que um gateway de verdade enviaria. Só funciona em localhost.
//
// Uso:
//   npm run pagamento:teste                 -> aprova a cobrança pendente mais recente
//   npm run pagamento:teste -- recusado     -> recusa a mais recente
//   npm run pagamento:teste -- aprovado <id-da-cobrança>
import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";

const STATUS = {
  aprovado: "APPROVED",
  recusado: "REJECTED",
  expirado: "EXPIRED",
  estornado: "REFUNDED",
};

const [action = "aprovado", givenId] = process.argv.slice(2);
const status = STATUS[action];
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

if (!status) {
  console.error(`Ação desconhecida: "${action}". Use: ${Object.keys(STATUS).join(", ")}.`);
  process.exit(1);
}
if (process.env.PAYMENT_PROVIDER !== "teste-local" || !secret) {
  console.error('Defina PAYMENT_PROVIDER="teste-local" e PAYMENT_WEBHOOK_SECRET no .env.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  givenId
    ? `SELECT "providerPaymentId", "amountCents" FROM "Payment"
       WHERE "provider" = 'teste-local' AND "providerPaymentId" = $1`
    : `SELECT "providerPaymentId", "amountCents" FROM "Payment"
       WHERE "provider" = 'teste-local' AND "status" = 'PENDING'
       ORDER BY "createdAt" DESC LIMIT 1`,
  givenId ? [givenId] : [],
);
await client.end();

if (!rows[0]) {
  console.error("Nenhuma cobrança de teste encontrada. Gere uma no checkout primeiro.");
  process.exit(1);
}

const body = JSON.stringify({
  id: `evt_${randomUUID()}`,
  paymentId: rows[0].providerPaymentId,
  status,
  amountCents: rows[0].amountCents,
});
const response = await fetch(`${appUrl}/api/webhooks/pagamento/teste-local`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-assinatura": createHmac("sha256", secret).update(body).digest("hex"),
  },
  body,
});
console.log(`Cobrança ${rows[0].providerPaymentId} -> ${action}: HTTP ${response.status}`);
console.log(await response.text());
process.exit(response.ok ? 0 : 1);
