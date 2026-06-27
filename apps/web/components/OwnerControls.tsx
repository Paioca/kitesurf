'use client';

// Controles do dono no detalhe do anúncio: editar, pausar/reativar, excluir.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { color } from '../lib/tokens';
import { isEditable, type ListingStatus } from '../lib/listing-status';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

export function OwnerControls({ listingId, status, saleRecord = false, compact = false }: { listingId: string; status: string; saleRecord?: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  async function setStatus(next: 'active' | 'paused', okMsg = next === 'paused' ? 'Anúncio pausado.' : 'Anúncio reativado.') {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      toast.show(okMsg);
      router.refresh(); setBusy(false);
    } catch (e: any) { setErr(e.message); toast.show(e.message, 'err'); setBusy(false); }
  }

  async function remove() {
    const ok = await confirm({ title: 'Excluir este anúncio?', body: 'Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      toast.show('Anúncio excluído.');
      router.push('/conta/anuncios'); // antes ia pra /conta
    } catch (e: any) { setErr(e.message); toast.show(e.message, 'err'); setBusy(false); }
  }

  // §10 — anúncio vendido/com venda registrada é imutável pra exclusão (fica como
  // registro do negócio). Editar/Pausar/Reativar seguem governados pelo status: um kit
  // parcialmente vendido continua ativo e gerenciável na peça que sobrou.
  const locked = saleRecord || status === 'sold';

  return (
    <div style={compact ? { padding: '4px 0 0' } : { border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24 }}>
      {!compact && <div style={{ fontSize: 13, fontWeight: 700, color: color.inkFaint2, marginBottom: 12 }}>Você é o dono deste anúncio</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {isEditable(status as ListingStatus) && <Link href={`/anuncio/${listingId}/editar`} style={btnPrimary}>Editar</Link>}
        {status === 'active' && <button onClick={() => setStatus('paused')} disabled={busy} style={btnOutline}>Pausar</button>}
        {status === 'paused' && <button onClick={() => setStatus('active')} disabled={busy} style={btnOutline}>Reativar</button>}
        {status === 'archived' && <button onClick={() => setStatus('active', 'Anúncio republicado.')} disabled={busy} style={btnOutline}>Republicar</button>}
        {!locked && <button onClick={remove} disabled={busy} style={btnDanger}>Excluir</button>}
      </div>
      {locked && <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 10, lineHeight: 1.45 }}>{status === 'sold' ? 'Vendido. Este anúncio fica no seu histórico e não pode ser excluído.' : 'Este anúncio tem uma venda registrada e não pode ser excluído.'}</div>}
      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
    </div>
  );
}

const base: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, padding: '11px 20px', borderRadius: 11, textDecoration: 'none', cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...base, background: color.primary, color: '#fff' };
const btnOutline: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink };
const btnDanger: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid #f0d4d0`, color: '#b3261e' };
