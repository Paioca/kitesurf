'use client';

// Bolinha vermelha com o nº de novidades não-lidas (pedido novo, aceite, recusa,
// venda marcada, vendido a outro, anúncio removido — os dois lados). Some quando 0.
import { useEffect, useState } from 'react';

export function RequestBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return; // não buscar em aba oculta
      fetch('/api/requests/count').then((r) => r.json()).then((d) => { if (alive) setN(d.unread ?? 0); }).catch(() => {});
    };
    refresh();
    // Zera na hora quando /pedidos marca tudo lido (evento de MarkNotificationsRead),
    // sem esperar o próximo ciclo de polling.
    const clear = () => { if (alive) setN(0); };
    // Polling leve + refetch ao voltar pra aba: o badge passa a atualizar sozinho,
    // sem o vendedor precisar recarregar a página pra descobrir um pedido novo.
    const id = setInterval(refresh, 45_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('notifications-read', clear);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('notifications-read', clear);
    };
  }, []);
  if (!n) return null;
  return (
    <span style={{ position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: '#d14b4b', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
      {n > 9 ? '9+' : n}
    </span>
  );
}
