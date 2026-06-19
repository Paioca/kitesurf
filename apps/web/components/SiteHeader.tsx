// Header desktop Kite Life. Server-compatible.
import { color, radius } from '../lib/tokens';
import { Logo } from './ui';
import { AccountNav } from './AccountNav';
import { HeaderNav } from './HeaderNav';

export function SiteHeader() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(246,243,236,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${color.line}` }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo size={21} /></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <HeaderNav />
          <AccountNav />
          <a href="/anunciar" style={{ fontSize: 14.5, fontWeight: 700, color: color.accentInk, background: color.accent, padding: '11px 22px', borderRadius: radius.pill, textDecoration: 'none' }}>Anunciar</a>
        </div>
      </div>
    </header>
  );
}
