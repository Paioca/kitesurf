'use client';

import { useState } from 'react';
import { color, font } from '../lib/tokens';
import { useToast } from './Toast';

// Compartilhar o anúncio. No celular usa a bandeja nativa do SO (Web Share API) — WhatsApp,
// Instagram, Telegram, copiar, tudo num toque. Em desktop sem suporte, copia o link e avisa.
// O preview rico (foto/título/preço) ao compartilhar já vem das meta tags OG da página
// (generateMetadata em anuncio/[id]/page.tsx) — aqui é só o gatilho.
export function ShareButton({ url, title, text }: { url: string; title: string; text: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        // Cancelar a bandeja rejeita com AbortError — silencioso, não é erro.
        try { await navigator.share({ title, text, url }); } catch { /* cancelado */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.show('Link copiado — cole onde quiser.');
      } catch {
        toast.show('Não consegui copiar o link.', 'err');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={share} disabled={busy} aria-label="Compartilhar anúncio" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '11px 18px', borderRadius: 999, background: color.surface, border: `1px solid ${color.lineChip}`, color: color.ink, fontFamily: font.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Compartilhar
    </button>
  );
}
