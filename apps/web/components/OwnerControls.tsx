'use client';

// Controles do dono no detalhe do anúncio: editar, pausar/reativar, excluir.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function OwnerControls({ listingId, status }: { listingId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function setStatus(next: 'active' | 'paused') {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      window.location.reload();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  async function remove() {
    if (!window.confirm('Excluir este anúncio? Essa ação não pode ser desfeita.')) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      window.location.href = '/conta';
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: color.inkFaint2, marginBottom: 12 }}>Você é o dono deste anúncio</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href={`/anuncio/${listingId}/editar`} style={btnPrimary}>Editar</a>
        {status === 'active' && <button onClick={() => setStatus('paused')} disabled={busy} style={btnOutline}>Pausar</button>}
        {status === 'paused' && <button onClick={() => setStatus('active')} disabled={busy} style={btnOutline}>Reativar</button>}
        <button onClick={remove} disabled={busy} style={btnDanger}>Excluir</button>
      </div>
      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
    </div>
  );
}

const base: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, padding: '11px 20px', borderRadius: 11, textDecoration: 'none', cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...base, background: color.primary, color: '#fff' };
const btnOutline: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink };
const btnDanger: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid #f0d4d0`, color: '#b3261e' };
