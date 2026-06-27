// 404 branded — link de anúncio morto (vendido/removido) cai aqui com volta pro funil.
import { color, font } from '../lib/tokens';
import Link from 'next/link';
import { Logo } from '../components/ui';
import { Footer } from '../components/Footer';

export const metadata = { title: 'Página não encontrada | Kitetropos' };

export default function NotFound() {
  return (
    <>
      <header style={{ borderBottom: `1px solid ${color.line}`, background: '#fff' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}><Logo size={21} /></Link>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(60px,12vw,120px) 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>Página não encontrada</div>
        <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(44px,9vw,72px)', fontWeight: 900, letterSpacing: '-2px', textTransform: 'uppercase', margin: '0 0 16px', lineHeight: 1 }}>404</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: color.inkMute, margin: '0 0 28px' }}>Esta página não está disponível. O anúncio pode ter sido vendido, arquivado ou removido.</p>
        <Link href="/" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', padding: '14px 26px', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Voltar à busca</Link>
      </main>
      <Footer />
    </>
  );
}
