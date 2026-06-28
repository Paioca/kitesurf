'use client';

// App bar + bottom tab bar do mobile. Esconde atalhos de conta quando não há sessão.
import { color } from '../lib/tokens';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Diamond, Logo } from './ui';
import { AccountNav } from './AccountNav';
import { RequestBadge } from './RequestBadge';
import { LanguageToggle } from './LanguageToggle';

export function MobileAppBar() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(246,243,236,0.94)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${color.line}`, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo size={18} /></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LanguageToggle compact />
        <AccountNav mobile />
      </div>
    </header>
  );
}

export function MobileTabBar({ active = 'home' }: { active?: 'home' | 'fav' | 'msg' | 'anuncios' }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((u) => setAuthed(!!(u && u.id)))
      .catch(() => setAuthed(false));
  }, []);

  if (authed !== true) {
    return (
      <nav style={tabBar}>
        <Link href="/" style={tab(active === 'home')}><Diamond size={18} c={active === 'home' ? color.primary : color.inkFaint2} r={3} /><span style={lbl(active === 'home')}>Início</span></Link>
        <Link href="/#browse" style={tab(false)}><span style={searchIcon}>⌕</span><span style={lbl(false)}>Ver kites</span></Link>
        <Link href="/anunciar" style={{ ...tab(false), marginTop: -14, color: color.ink }}>
          <span style={fab}>+</span><span style={{ fontSize: 10.5, fontWeight: 700 }}>Anunciar</span>
        </Link>
        <Link href="/entrar" style={tab(false)}><span style={loginIcon}>↗</span><span style={lbl(false)}>Entrar</span></Link>
      </nav>
    );
  }

  return (
    <nav style={tabBar}>
      <Link href="/" style={tab(active === 'home')}><Diamond size={18} c={active === 'home' ? color.primary : color.inkFaint2} r={3} /><span style={lbl(active === 'home')}>Início</span></Link>
      <Link href="/favoritos" style={tab(active === 'fav')}><span style={{ fontSize: 19 }}>{active === 'fav' ? '♥' : '♡'}</span><span style={lbl(active === 'fav')}>Favoritos</span></Link>
      <Link href="/anunciar" style={{ ...tab(false), marginTop: -14, color: color.ink }}>
        <span style={fab}>+</span><span style={{ fontSize: 10.5, fontWeight: 700 }}>Anunciar</span>
      </Link>
      <Link href="/pedidos" style={tab(active === 'msg')}><span style={{ position: 'relative', fontSize: 18 }}>✉<RequestBadge /></span><span style={lbl(active === 'msg')}>Negociações</span></Link>
      <Link href="/conta/anuncios" style={tab(active === 'anuncios')}><span style={{ width: 19, height: 15, borderRadius: 4, border: `2px solid ${active === 'anuncios' ? color.primary : color.inkFaint2}`, display: 'block', position: 'relative' }}><span style={{ position: 'absolute', left: 3, right: 3, top: 3, height: 2, borderRadius: 2, background: active === 'anuncios' ? color.primary : color.inkFaint2 }} /></span><span style={lbl(active === 'anuncios')}>Meus anúncios</span></Link>
    </nav>
  );
}

const tabBar: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 30, background: '#fff', borderTop: `1px solid ${color.line}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 14px 16px' };
const tab = (on: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: on ? color.primary : color.inkFaint2 });
const lbl = (on: boolean): React.CSSProperties => ({ fontSize: 10.5, fontWeight: on ? 700 : 600 });
const fab: React.CSSProperties = { width: 48, height: 48, borderRadius: 999, background: color.accent, color: color.accentInk, fontSize: 26, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(217,168,107,0.5)' };
const searchIcon: React.CSSProperties = { fontSize: 23, lineHeight: 1, transform: 'translateY(-1px)' };
const loginIcon: React.CSSProperties = { width: 21, height: 21, borderRadius: 999, border: `2px solid ${color.inkFaint2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1 };
