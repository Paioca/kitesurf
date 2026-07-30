import { font } from '../lib/tokens';
import { cookies } from 'next/headers';
import { Logo } from './ui';

export async function Footer() {
  const en = (await cookies()).get('kitetropos:locale')?.value === 'en';
  const copy = en
    ? {
        body: 'Brazilian kitesurf gear marketplace for riders across Brazil.',
        search: 'Browse gear',
        announce: 'List gear',
        myAds: 'My listings',
        deals: 'My deals',
        trust: 'Trust',
        terms: 'Terms of use',
        privacy: 'Privacy policy',
        learn: 'Learn more',
        about: 'About',
        how: 'How it works',
        buy: 'Buy a used kite',
        sell: 'Sell a used kite',
        guide: 'Used-kite checklist',
        born: "Built for Brazil's kitesurf spots.",
      }
    : {
        body: 'Marketplace brasileiro de equipamentos de kitesurf para kitesurfistas de todo o país.',
        search: 'Buscar equipamento',
        announce: 'Anunciar equipamento',
        myAds: 'Meus anúncios',
        deals: 'Minhas negociações',
        trust: 'Confiança',
        terms: 'Termos de uso',
        privacy: 'Política de privacidade',
        learn: 'Saiba mais',
        about: 'Sobre',
        how: 'Como funciona',
        buy: 'Comprar kite usado',
        sell: 'Vender kite usado',
        guide: 'Checklist do usado',
        born: 'Feito para conectar os spots do Brasil.',
      };

  return (
    <footer style={{ background: '#14302a' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,72px) 32px 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap', marginBottom: 48 }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ marginBottom: 18 }}><Logo size={21} onDark /></div>
            <p style={{ fontFamily: font.serif, fontSize: 16, lineHeight: 1.6, color: '#a9c0b5', margin: 0 }}>{copy.body}</p>
          </div>
          <div style={{ display: 'flex', gap: 72, flexWrap: 'wrap' }}>
            <FootCol title="Marketplace" links={[[copy.search, '/'], [copy.announce, '/anunciar'], [copy.myAds, '/conta/anuncios'], [copy.deals, '/pedidos']]} />
            <FootCol title={copy.learn} links={[[copy.about, '/sobre'], [copy.how, '/como-funciona'], [copy.buy, '/comprar-kite-usado'], [copy.sell, '/vender-kite-usado'], [copy.guide, '/guias/checklist-kite-usado']]} />
            <FootCol title={copy.trust} links={[[copy.terms, '/termos'], [copy.privacy, '/privacidade']]} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(220,232,225,0.14)', paddingTop: 26, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#8aa399' }}>© 2026 Kitetropos</span>
          <span style={{ fontSize: 13, color: '#8aa399' }}>{copy.born}</span>
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
