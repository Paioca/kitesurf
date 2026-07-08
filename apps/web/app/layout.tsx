import type { Metadata, Viewport } from 'next';
import { Archivo, Spectral } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager, GoogleTagManagerNoScript } from '../components/GoogleTagManager';
import { ToastProvider } from '../components/Toast';
import { ConfirmProvider } from '../components/ConfirmDialog';
import { publicBaseUrl } from '../lib/app-url';
import { cookies } from 'next/headers';
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
  metadataBase: new URL(publicBaseUrl()),
  title: 'Kitetropos | equipamentos de kitesurf e wing com mais confiança',
  description: 'Marketplace brasileiro de equipamentos de kitesurf e wing, com telefone verificado, anúncios estruturados e contato pelo WhatsApp.',
};

// O teclado virtual do mobile redimensiona o conteúdo (interactive-widget) em vez de
// sobrepor o CTA fixo do rodapé do wizard de anúncio (.criar-nav). Sem isso, em telas
// pequenas o teclado cobre o botão "Continuar/Publicar" e a mensagem de validação.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

// Render dinâmico em TODAS as rotas (CSP nonce por request). O nonce só é carimbado nos
// <script> de páginas renderizadas por request; uma página estática (pré-renderada no build)
// teria scripts inline SEM nonce e seria bloqueada pela CSP estrita (script-src com nonce,
// sem 'unsafe-inline'). Forçar dinâmico aqui no layout raiz cobre todas as rotas — inclusive
// as antes estáticas (entrar/anuncios/termos/etc.). Trade-off aceito: perde cache estático/ISR.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = (await cookies()).get('kitetropos:locale')?.value === 'en' ? 'en' : 'pt-BR';
  return (
    <html lang={lang} className={`${archivo.variable} ${spectral.variable}`}>
      <body>
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
