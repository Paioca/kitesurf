'use client';

// Coração de favorito. Otimista. Sem login → /entrar. variant 'overlay' (card)
// ou 'inline' (detalhe).
import { useState } from 'react';
import { color } from '../lib/tokens';

export function FavoriteButton({ listingId, initial = false, variant = 'overlay' }: { listingId: string; initial?: boolean; variant?: 'overlay' | 'inline' }) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !fav;
    setFav(next);
    try {
      const res = await fetch(`/api/listings/${listingId}/favorite`, { method: next ? 'POST' : 'DELETE' });
      if (res.status === 401) { window.location.href = '/entrar'; return; }
      if (!res.ok) setFav(!next);
    } catch { setFav(!next); } finally { setBusy(false); }
  }

  const heart = fav ? '♥' : '♡';

  if (variant === 'inline') {
    return (
      <button onClick={toggle} aria-pressed={fav} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${fav ? color.primary : color.lineCard}`, color: fav ? color.primary : color.ink, borderRadius: 11, padding: '11px 18px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
        <span style={{ fontSize: 17, color: fav ? '#d14b4b' : color.inkFaint }}>{heart}</span>{fav ? 'Salvo' : 'Salvar'}
      </button>
    );
  }

  return (
    <button onClick={toggle} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'} aria-pressed={fav} style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.94)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1, color: fav ? '#d14b4b' : '#7c857c', cursor: 'pointer', zIndex: 3 }}>
      {heart}
    </button>
  );
}
