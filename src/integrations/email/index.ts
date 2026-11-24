import { env } from "@/lib/env";

export type Email = { to: string; subject: string; text: string; html: string };

export type EmailResult = { delivered: boolean };

/**
 * Envia e-mails transacionais pela API do Resend.
 * Sem RESEND_API_KEY e EMAIL_FROM configurados, nada é enviado: em desenvolvimento
 * o conteúdo aparece no terminal do servidor; em produção o envio falha de forma explícita.
 */
export async function sendEmail(email: Email): Promise<EmailResult> {
  const { RESEND_API_KEY, EMAIL_FROM, NODE_ENV } = env();

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    if (NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY/EMAIL_FROM ausentes: e-mail não enviado.");
      return { delivered: false };
    }
    console.info(`[email:dev] Para: ${email.to}\nAssunto: ${email.subject}\n\n${email.text}\n`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error(`[email] Resend respondeu ${response.status}.`);
    return { delivered: false };
  }
  return { delivered: true };
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Layout simples de e-mail com as cores da Oficina do Noel. */
export function emailLayout(options: {
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
}): { text: string; html: string } {
  const { title, paragraphs, action } = options;
  const text = [title, "", ...paragraphs, ...(action ? ["", `${action.label}: ${action.url}`] : [])]
    .join("\n")
    .concat("\n\nOficina do Noel");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#503020;padding:24px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#F0F0E0;border-radius:20px;padding:32px;color:#38251B">
<tr><td>
<p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#A01020">Oficina do Noel</p>
<h1 style="margin:0 0 16px;font-size:24px;color:#A01020">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5">${escapeHtml(p)}</p>`).join("\n")}
${
  action
    ? `<p style="margin:24px 0 8px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#A01020;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">${escapeHtml(action.label)}</a></p>
<p style="margin:0;font-size:13px;color:#6b5a50;word-break:break-all">Se o botão não abrir, copie este endereço: ${escapeHtml(action.url)}</p>`
    : ""
}
</td></tr></table></td></tr></table></body></html>`;

  return { text, html };
}
