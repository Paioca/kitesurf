'use client';

// Detecta login no cliente e troca "Entrar" por "Minha conta". Usado no header
// desktop e no app bar mobile (que são server-compatible, mas este filho é client).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { color, radius } from '../lib/tokens';

type Me = { id: string; name?: string; avatarUrl?: string } | null;
type AccountLabels = { signIn?: string; account?: string };

export function AccountNav({ mobile = false, labels, initialMe }: { mobile?: boolean; labels?: AccountLabels; initialMe?: Me }) {
  // Quando o servidor injeta a sessão (initialMe definido, mesmo que null), o SSR já
  // renderiza o estado certo — sem o flash "Entrar" → "Minha conta". Páginas client sem
  // sessão no servidor (anunciar/error) omitem a prop e caímos no fetch (comportamento antigo).
  const [me, setMe] = useState<Me | undefined>(initialMe);
  const signInLabel = labels?.signIn ?? 'Entrar';
  const accountLabel = labels?.account ?? 'Minha conta';
  useEffect(() => {
    if (initialMe !== undefined) return; // servidor já resolveu; força-dynamic revalida a cada navegação
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((u) => setMe(u && u.id ? u : null)).catch(() => setMe(null));
  }, [initialMe]);

  if (me === undefined) return <span style={{ width: mobile ? 54 : 64 }} />; // reserva espaço enquanto carrega

  if (!me) {
    return mobile
      ? <Link href="/entrar" style={{ fontSize: 13.5, fontWeight: 700, color: color.primary, textDecoration: 'none' }}>{signInLabel}</Link>
      : <Link href="/entrar" style={{ fontSize: 15, fontWeight: 500, color: color.ink, textDecoration: 'none' }}>{signInLabel}</Link>;
  }

  const avatar = (
    <span style={{ width: mobile ? 28 : 30, height: mobile ? 28 : 30, borderRadius: 999, flex: 'none', background: me.avatarUrl ? `center/cover url("${me.avatarUrl}")` : color.primary, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!me.avatarUrl && (me.name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );

  if (mobile) return <Link href="/conta" style={{ textDecoration: 'none', display: 'flex' }}>{avatar}</Link>;

  return (
    <Link href="/conta" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: color.ink, fontSize: 14.5, fontWeight: 600, background: '#fff', border: `1px solid ${color.lineCard}`, padding: '6px 12px 6px 7px', borderRadius: radius.pill }}>
      {avatar}<span>{accountLabel}</span>
    </Link>
  );
}
