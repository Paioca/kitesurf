'use client';

// Atalhos do marketplace no header desktop (só logado): o que importa no dia a dia.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { color } from '../lib/tokens';
import { RequestBadge } from './RequestBadge';

type HeaderLabels = { myAds?: string; deals?: string; favorites?: string };

export function HeaderNav({ labels, initialAuthed }: { labels?: HeaderLabels; initialAuthed?: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed ?? false);
  useEffect(() => {
    if (initialAuthed !== undefined) return; // servidor já resolveu o estado de login
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((u) => setAuthed(!!(u && u.id))).catch(() => {});
  }, [initialAuthed]);
  if (!authed) return null;

  const link: React.CSSProperties = { fontSize: 14.5, fontWeight: 600, color: color.ink, textDecoration: 'none' };
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 22, marginRight: 4 }}>
      <Link href="/conta/anuncios" style={link}>{labels?.myAds ?? 'Meus anúncios'}</Link>
      <Link href="/pedidos" style={{ ...link, position: 'relative' }}>{labels?.deals ?? 'Minhas negociações'}<RequestBadge /></Link>
      <Link href="/favoritos" style={link}>{labels?.favorites ?? 'Favoritos'}</Link>
    </nav>
  );
}
