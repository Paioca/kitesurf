// App bar + bottom tab bar do mobile. Server-compatible (links).
import { color } from '../lib/tokens';
import { Diamond, Logo } from './ui';

export function MobileAppBar() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(246,243,236,0.94)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${color.line}`, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <a href="/" style={{ textDecoration: 'none' }}><Logo size={18} /></a>
      <a href="/entrar" style={{ fontSize: 13.5, fontWeight: 700, color: color.primary, textDecoration: 'none' }}>Entrar</a>
    </header>
  );
}

export function MobileTabBar({ active = 'home' }: { active?: 'home' | 'fav' | 'msg' | 'perfil' }) {
  return (
    <nav style={tabBar}>
      <a href="/" style={tab(active === 'home')}><Diamond size={18} c={active === 'home' ? color.primary : color.inkFaint2} r={3} /><span style={lbl(active === 'home')}>Início</span></a>
      <span style={{ ...tab(false), opacity: 0.5 }} title="Em breve"><span style={{ fontSize: 19 }}>♡</span><span style={lbl(false)}>Favoritos</span></span>
      <a href="/anunciar" style={{ ...tab(false), marginTop: -14, color: color.ink }}>
        <span style={fab}>+</span><span style={{ fontSize: 10.5, fontWeight: 700 }}>Anunciar</span>
      </a>
      <a href="/chat" style={tab(active === 'msg')}><span style={{ fontSize: 18 }}>✉</span><span style={lbl(active === 'msg')}>Mensagens</span></a>
      <span style={{ ...tab(false), opacity: 0.5 }} title="Em breve"><span style={{ width: 19, height: 19, borderRadius: 999, background: '#cfd8d2', display: 'block' }} /><span style={lbl(false)}>Perfil</span></span>
    </nav>
  );
}

const tabBar: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 30, background: '#fff', borderTop: `1px solid ${color.line}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 14px 16px' };
const tab = (on: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: on ? color.primary : color.inkFaint2 });
const lbl = (on: boolean): React.CSSProperties => ({ fontSize: 10.5, fontWeight: on ? 700 : 600 });
const fab: React.CSSProperties = { width: 48, height: 48, borderRadius: 999, background: color.accent, color: color.accentInk, fontSize: 26, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(217,168,107,0.5)' };
