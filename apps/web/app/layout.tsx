import type { Metadata } from 'next';
import { Archivo, Spectral } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ToastProvider } from '../components/Toast';
import './globals.css';

// Fontes self-hosted via next/font: elimina o request render-blocking ao
// fonts.googleapis.com, gera preload automático e aplica size-adjust (corta CLS
// de fonte). `display: 'swap'` mantém o texto visível durante o load. As CSS
// variables são consumidas em globals.css (font.sans / font.serif).
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});
const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-spectral',
  display: 'swap',
});

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
    <html lang="pt-BR" className={`${archivo.variable} ${spectral.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
