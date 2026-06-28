'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Tela de erro precisa de saída por navegação nativa mesmo sem hidratação. */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Error boundary global do App Router — captura erros de render do client e
// envia pro Sentry antes de mostrar o fallback.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void reset;

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Algo deu errado</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Já fomos avisados. Tente de novo.</p>
        <a href="" style={{ display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}>
          Tentar novamente
        </a>
        <a href="/" style={{ display: 'inline-block', marginLeft: 8, padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}>
          Voltar à busca
        </a>
      </body>
    </html>
  );
}
