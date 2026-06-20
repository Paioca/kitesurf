'use client';

// Comprador retira a própria oferta/visita pendente. Confirmação inline pra não
// cancelar sem querer.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function CancelRequestButton({ requestId, type }: { requestId: string; type: 'offer' | 'visit' }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState('');
  const noun = type === 'offer' ? 'a oferta' : 'o pedido de visita';

  async function run() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/requests/${requestId}`, { method: 'DELETE' });
      if (res.ok) window.location.reload();
      else { setErr((await res.json().catch(() => ({}))).message ?? 'Erro.'); setBusy(false); }
    } catch { setErr('Sem conexão.'); setBusy(false); }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} style={ghost}>Cancelar {noun}</button>
    );
  }
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: color.ink }}>Cancelar {noun}? Você pode reenviar depois.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={run} disabled={busy} style={{ ...ghost, marginTop: 0, color: '#b3261e', borderColor: '#e6b8b1' }}>Sim, cancelar</button>
        <button onClick={() => setConfirming(false)} disabled={busy} style={{ ...ghost, marginTop: 0 }}>Voltar</button>
      </div>
      {err && <div style={{ color: '#b3261e', fontSize: 12.5 }}>{err}</div>}
    </div>
  );
}

const ghost: React.CSSProperties = { marginTop: 10, background: '#fff', color: color.ink, border: `1.5px solid ${color.lineInput}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
