'use client';

// Vendedor: aceitar (libera WhatsApp) ou recusar um pedido.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function RequestActions({ id }: { id: string }) {
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
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      <button onClick={() => act('accepted')} disabled={busy} style={{ background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Aceitar · liberar WhatsApp</button>
      <button onClick={() => act('declined')} disabled={busy} style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0d4d0', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Recusar</button>
    </div>
  );
}
