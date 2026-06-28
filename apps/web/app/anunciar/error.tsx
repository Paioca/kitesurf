'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Tela de erro precisa de saída por navegação nativa mesmo sem hidratação. */

// Rede de segurança do /anunciar (auditoria mobile #01): qualquer erro de render do
// fluxo cai AQUI — nunca numa tela só de fundo. Estado sempre visível, com saída.
import { useEffect } from 'react';
import { color, font } from '../../lib/tokens';
import { MobileAppBar } from '../../components/MobileChrome';

export default function AnunciarError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void reset;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[anunciar] erro de render', error);
  }, [error]);

  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px 90px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: '#fbeae4', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0492f', fontSize: 26, fontWeight: 800 }}>!</div>
        <h1 style={{ fontFamily: font.serif, fontSize: 28, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 10px' }}>Algo travou ao montar o anúncio</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: color.inkMute, margin: '0 auto 26px', maxWidth: 420 }}>
          Foi um erro nosso ao carregar esta tela. Seu rascunho fica salvo no aparelho. Tente de novo; se persistir, recarregue a página.
        </p>
        <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="" style={{ background: color.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 26px', fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Tentar de novo</a>
          <a href="/" style={{ background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink, borderRadius: 12, padding: '14px 26px', fontFamily: font.sans, fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>Voltar à busca</a>
        </div>
      </main>
    </>
  );
}
