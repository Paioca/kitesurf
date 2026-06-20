'use client';

// Vendedor: aceitar (libera WhatsApp) ou recusar um pedido.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function RequestActions({ id, type }: { id: string; type?: string }) {
  const [busy, setBusy] = useState(false);
  async function act(status: 'accepted' | 'declined') {
    if (status === 'declined' && !window.confirm('Recusar este pedido?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) window.location.reload();
      else setBusy(false);
    } catch { setBusy(false); }
  }
  const kindWord = type === 'visit' ? 'visita' : 'oferta';
  return (
    <div style={{ display: 'flex', gap: 11, marginTop: 12 }}>
      <button onClick={() => act('declined')} disabled={busy} style={{ flex: 'none', background: '#fff', color: color.inkMute, border: `1.5px solid ${color.lineInput}`, borderRadius: 11, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Recusar</button>
      <button onClick={() => act('accepted')} disabled={busy} style={{ flex: 1, background: color.primary, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Aceitar {kindWord} · liberar WhatsApp</button>
    </div>
  );
}
