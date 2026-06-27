import { font } from '../lib/tokens';
import { Logo } from './ui';

export function Footer() {
  return (
    <footer style={{ background: '#14302a' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 32px 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap', marginBottom: 48 }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ marginBottom: 18 }}><Logo size={21} onDark /></div>
            <p style={{ fontFamily: font.serif, fontSize: 16, lineHeight: 1.6, color: '#a9c0b5', margin: 0 }}>Marketplace de kite e barra para a comunidade global do kitesurf. Nascido em Cumbuco.</p>
          </div>
          <div style={{ display: 'flex', gap: 72, flexWrap: 'wrap' }}>
            <FootCol title="Marketplace" links={[['Buscar equipamento', '/'], ['Anunciar equipamento', '/anunciar'], ['Meus anúncios', '/conta/anuncios'], ['Minhas negociações', '/pedidos']]} />
            <FootCol title="Confiança" links={[['Termos de uso', '/termos'], ['Política de privacidade', '/privacidade']]} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(220,232,225,0.14)', paddingTop: 26, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#8aa399' }}>© 2026 Kitetropos</span>
          <span style={{ fontSize: 13, color: '#8aa399' }}>Nascido em Cumbuco. Aberto para o mundo.</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px', color: '#e7c79a', marginBottom: 18 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {links.map(([label, href]) => (
          <a key={href} href={href} style={{ fontSize: 14.5, color: '#dce8e1', textDecoration: 'none' }}>{label}</a>
        ))}
      </div>
    </div>
  );
}
