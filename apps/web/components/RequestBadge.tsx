'use client';

// Bolinha vermelha com o nº de novidades não-lidas (pedido novo, aceite, recusa,
// venda marcada, vendido a outro, anúncio removido — os dois lados). Some quando 0.
import { useEffect, useState } from 'react';

export function RequestBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch('/api/requests/count').then((r) => r.json()).then((d) => setN(d.unread ?? d.pending ?? 0)).catch(() => {});
  }, []);
  if (!n) return null;
  return (
    <span style={{ position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: '#d14b4b', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
      {n > 9 ? '9+' : n}
    </span>
  );
}
