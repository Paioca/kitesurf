'use client';

import { useState } from 'react';
import { color, font } from '../lib/tokens';
import { useToast } from './Toast';

// Compartilhar o anúncio. No celular usa a bandeja nativa do SO (Web Share API) — WhatsApp,
// Instagram, Telegram, copiar, tudo num toque. Em desktop sem suporte, copia o link e avisa.
// O preview rico (foto/título/preço) ao compartilhar já vem das meta tags OG da página
// (generateMetadata em anuncio/[id]/page.tsx) — aqui é só o gatilho.
//
// Analytics: share concluído dispara `share_listing` no dataLayer (cancelar a bandeja não
// conta). O push é incondicional — sem GTM carregado (local/staging, onde NEXT_PUBLIC_GTM_ID
// não existe) o array só acumula, sem erro.

type ShareContext = 'listing_page' | 'post_publish';

export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: unknown[] };
  (w.dataLayer ||= []).push({ event, ...params });
}

export function ShareButton({ url, title, text, listingId, context = 'listing_page', variant = 'outline' }: {
  url: string;
  title: string;
  text: string;
  listingId?: string;
  context?: ShareContext;
  variant?: 'outline' | 'primary';
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        // Cancelar a bandeja rejeita com AbortError — silencioso, não é erro.
        try {
          await navigator.share({ title, text, url });
          trackEvent('share_listing', { listing_id: listingId, method: 'native', context });
        } catch { /* cancelado */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        trackEvent('share_listing', { listing_id: listingId, method: 'copy', context });
        toast.show('Link copiado — cole onde quiser.');
      } catch {
        toast.show('Não consegui copiar o link.', 'err');
      }
    } finally {
      setBusy(false);
    }
  }

  const styles: React.CSSProperties = variant === 'primary'
    ? { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '13px 26px', borderRadius: 999, background: color.dark, border: `1px solid ${color.dark}`, color: '#fff', fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' }
    : { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '11px 18px', borderRadius: 999, background: color.surface, border: `1px solid ${color.lineChip}`, color: color.ink, fontFamily: font.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' };

  return (
    <button onClick={share} disabled={busy} aria-label="Compartilhar anúncio" style={styles}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Compartilhar
    </button>
  );
}

// Atalho direto pro WhatsApp (wa.me) — a Web Share API acima delega pro SO, então só mostra
// o WhatsApp como opção se o app estiver instalado/registrado (no celular, sim; no desktop
// de teste, não). Como WhatsApp é o canal de fato usado pra vender usado no nicho (grupo do
// spot), este botão GARANTE a abertura dele em qualquer dispositivo, sem depender do SO.
export function WhatsappShareButton({ url, text, listingId, context = 'listing_page' }: {
  url: string;
  text: string;
  listingId?: string;
  context?: ShareContext;
}) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const styles: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '13px 26px',
    borderRadius: 999, background: '#25d366', border: '1px solid #25d366', color: '#fff', fontFamily: font.sans,
    fontSize: 15, fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('share_listing', { listing_id: listingId, method: 'whatsapp', context })}
      style={styles}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.484 1.346 4.997L2 22l5.116-1.341a9.965 9.965 0 0 0 4.888 1.244h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.18-2.928-7.069a9.935 9.935 0 0 0-7.073-2.834zm0 18.153h-.003a8.32 8.32 0 0 1-4.244-1.16l-.305-.181-3.036.796.81-2.96-.198-.304a8.298 8.298 0 0 1-1.27-4.435c0-4.59 3.735-8.325 8.325-8.325a8.28 8.28 0 0 1 5.888 2.44 8.28 8.28 0 0 1 2.434 5.892c0 4.59-3.735 8.238-8.401 8.238z"/>
      </svg>
      WhatsApp
    </a>
  );
}
