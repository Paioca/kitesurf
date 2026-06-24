import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ToastProvider } from '../components/Toast';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'https://kitesurf-web.vercel.app'),
  title: 'Kitetropos — kite e barra com mais confiança',
  description: 'Marketplace de kite e barra para a comunidade global do kitesurf, com telefone verificado, anúncios estruturados e contato pelo WhatsApp.',
};

// Render dinâmico em TODAS as rotas (CSP nonce por request). O nonce só é carimbado nos
// <script> de páginas renderizadas por request; uma página estática (pré-renderada no build)
// teria scripts inline SEM nonce e seria bloqueada pela CSP estrita (script-src com nonce,
// sem 'unsafe-inline'). Forçar dinâmico aqui no layout raiz cobre todas as rotas — inclusive
// as antes estáticas (entrar/anuncios/termos/etc.). Trade-off aceito: perde cache estático/ISR.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
