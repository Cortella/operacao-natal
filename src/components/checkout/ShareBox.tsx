"use client";

import { useState } from "react";
import { Button, SecondaryButton } from "@/components/ui";

type Props = {
  url: string;
  recipientName: string;
};

/** Link exclusivo do presente, com cópia e compartilhamento pelo WhatsApp. */
export function ShareBox({ url, recipientName }: Props) {
  const [copied, setCopied] = useState(false);
  const message = `${recipientName}, preparei um presente de Natal para você! 🎁 Abra aqui: ${url}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o campo fica selecionável.
    }
  }

  return (
    <div className="w-full space-y-3">
      <label htmlFor="gift-link" className="field-label">
        Link exclusivo do presente
      </label>
      <input
        id="gift-link"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="field-control text-center"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SecondaryButton href={whatsapp} target="_blank" fullWidth>
          Enviar pelo WhatsApp
        </SecondaryButton>
        <Button variant="outline" fullWidth onClick={copy}>
          {copied ? "Link copiado ✓" : "Copiar link"}
        </Button>
      </div>
    </div>
  );
}
