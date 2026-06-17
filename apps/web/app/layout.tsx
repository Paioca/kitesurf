import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kite Marketplace — Cumbuco',
  description: 'Compra e venda de equipamento de kitesurf com pagamento protegido.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-ocean-100 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <a href="/" className="font-bold text-ocean-700">
              🪁 Kite Marketplace
            </a>
            <nav className="flex items-center gap-2 text-sm">
              <a href="/anuncios" className="px-2 py-1.5 font-medium text-ocean-700">
                Anúncios
              </a>
              <a href="/anunciar" className="px-2 py-1.5 font-medium text-ocean-700">
                Anunciar
              </a>
              <a
                href="/entrar"
                className="rounded-lg bg-ocean-600 px-3 py-1.5 font-medium text-white"
              >
                Entrar
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
