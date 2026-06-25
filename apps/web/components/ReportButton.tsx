'use client';

import { color } from '../lib/tokens';
import { useToast } from './Toast';

export function ReportButton({ targetType, targetId, label }: { targetType: 'user' | 'listing' | 'message'; targetId: string; label: string }) {
  const toast = useToast();
  async function go() {
    // TODO: window.prompt ainda é nativo — trocar por modal com input quando houver um componente de input dialog.
    const reason = window.prompt('Conte rapidamente o motivo da denúncia:');
    if (!reason) return;
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId, reason }) });
      if (res.status === 401) { window.location.href = `/entrar?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
      if (res.ok) toast.show('Denúncia enviada. Obrigado por cuidar da comunidade.');
      else toast.show('Não foi possível enviar agora.', 'err');
    } catch { toast.show('Sem conexão. Tenta de novo.', 'err'); }
  }
  return (
    <button onClick={go} style={{ background: 'none', border: 'none', color: color.inkFaint2, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 6px', fontFamily: "var(--font-archivo),'Archivo',sans-serif", textDecoration: 'underline' }}>
      {label}
    </button>
  );
}
