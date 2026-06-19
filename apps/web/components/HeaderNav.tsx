'use client';

// Atalhos do marketplace no header desktop (só logado): o que importa no dia a dia.
import { useEffect, useState } from 'react';
import { color } from '../lib/tokens';
import { RequestBadge } from './RequestBadge';

export function HeaderNav() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((u) => setAuthed(!!(u && u.id))).catch(() => {});
  }, []);
  if (!authed) return null;

  const link: React.CSSProperties = { fontSize: 14.5, fontWeight: 600, color: color.ink, textDecoration: 'none' };
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 22, marginRight: 4 }}>
      <a href="/conta/anuncios" style={link}>Anúncios</a>
      <a href="/pedidos" style={{ ...link, position: 'relative' }}>Pedidos<RequestBadge /></a>
      <a href="/favoritos" style={link}>Favoritos</a>
    </nav>
  );
}
