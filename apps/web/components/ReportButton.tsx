'use client';

import { color } from '../lib/tokens';

export function ReportButton({ targetType, targetId, label }: { targetType: 'user' | 'listing' | 'message'; targetId: string; label: string }) {
  async function go() {
    const reason = window.prompt('Conte rapidamente o motivo da denúncia:');
    if (!reason) return;
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId, reason }) });
      if (res.status === 401) { window.location.href = `/entrar?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
      window.alert(res.ok ? 'Denúncia enviada. Obrigado por cuidar da comunidade.' : 'Não foi possível enviar agora.');
    } catch { window.alert('Sem conexão. Tenta de novo.'); }
  }
  return (
    <button onClick={go} style={{ background: 'none', border: 'none', color: color.inkFaint2, fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: "'Archivo',sans-serif", textDecoration: 'underline' }}>
      {label}
    </button>
  );
}
