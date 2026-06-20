'use client';

// Vendedor: aceitar (libera WhatsApp) ou recusar um pedido.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function RequestActions({ id, type }: { id: string; type?: string }) {
  const [busy, setBusy] = useState<'' | 'accepted' | 'declined'>('');
  const [err, setErr] = useState('');
  async function act(status: 'accepted' | 'declined') {
    if (status === 'declined' && !window.confirm('Recusar este pedido?')) return;
    setBusy(status); setErr('');
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) window.location.reload();
      else { setErr((await res.json().catch(() => ({}))).message ?? 'Não deu pra salvar. Tenta de novo.'); setBusy(''); }
    } catch { setErr('Sem conexão. Tenta de novo.'); setBusy(''); }
  }
  const kindWord = type === 'visit' ? 'visita' : 'oferta';
  const anyBusy = busy !== '';
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 11 }}>
        <button onClick={() => act('declined')} disabled={anyBusy} style={{ flex: 'none', background: '#fff', color: color.inkMute, border: `1.5px solid ${color.lineInput}`, borderRadius: 11, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy && busy !== 'declined' ? 0.5 : 1 }}>{busy === 'declined' ? 'Recusando…' : 'Recusar'}</button>
        <button onClick={() => act('accepted')} disabled={anyBusy} style={{ flex: 1, background: color.primary, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy && busy !== 'accepted' ? 0.6 : 1 }}>{busy === 'accepted' ? 'Liberando WhatsApp…' : `Aceitar ${kindWord} · liberar WhatsApp`}</button>
      </div>
      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
