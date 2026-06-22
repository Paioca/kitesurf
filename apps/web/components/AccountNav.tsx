'use client';

// Detecta login no cliente e troca "Entrar" por "Minha conta". Usado no header
// desktop e no app bar mobile (que são server-compatible, mas este filho é client).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { color, radius } from '../lib/tokens';

type Me = { id: string; name?: string; avatarUrl?: string } | null;

export function AccountNav({ mobile = false }: { mobile?: boolean }) {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((u) => setMe(u && u.id ? u : null)).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <span style={{ width: mobile ? 54 : 64 }} />; // reserva espaço enquanto carrega

  if (!me) {
    return mobile
      ? <Link href="/entrar" style={{ fontSize: 13.5, fontWeight: 700, color: color.primary, textDecoration: 'none' }}>Entrar</Link>
      : <Link href="/entrar" style={{ fontSize: 15, fontWeight: 500, color: color.ink, textDecoration: 'none' }}>Entrar</Link>;
  }

  const avatar = (
    <span style={{ width: mobile ? 28 : 30, height: mobile ? 28 : 30, borderRadius: 999, flex: 'none', background: me.avatarUrl ? `center/cover url("${me.avatarUrl}")` : color.primary, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!me.avatarUrl && (me.name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );

  if (mobile) return <Link href="/conta" style={{ textDecoration: 'none', display: 'flex' }}>{avatar}</Link>;

  return (
    <Link href="/conta" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: color.ink, fontSize: 14.5, fontWeight: 600, background: '#fff', border: `1px solid ${color.lineCard}`, padding: '6px 12px 6px 7px', borderRadius: radius.pill }}>
      {avatar}<span>Minha conta</span>
    </Link>
  );
}
