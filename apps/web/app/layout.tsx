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
