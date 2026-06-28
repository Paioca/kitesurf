// Header desktop Kitetropos. Server-compatible.
import { color, radius } from '../lib/tokens';
import Link from 'next/link';
import { Logo } from './ui';
import { AccountNav } from './AccountNav';
import { HeaderNav } from './HeaderNav';
import { LanguageToggle } from './LanguageToggle';

export function SiteHeader() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(246,243,236,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${color.line}` }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo size={21} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <HeaderNav />
          <LanguageToggle />
          <AccountNav />
          <Link href="/anunciar" className="kl-lift" style={{ display: 'inline-block', fontSize: 14.5, fontWeight: 700, color: color.accentInk, background: color.accent, padding: '11px 22px', borderRadius: radius.pill, textDecoration: 'none' }}>Anunciar</Link>
        </div>
      </div>
    </header>
  );
}
