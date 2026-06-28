'use client';

// Controles do dono no detalhe do anúncio: editar, pausar/reativar, excluir.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { color } from '../lib/tokens';
import { isEditable, type ListingStatus } from '../lib/listing-status';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

type Locale = 'pt' | 'en';
const COPY = {
  pt: {
    paused: 'Anúncio pausado.',
    reactivated: 'Anúncio reativado.',
    republished: 'Anúncio republicado.',
    deleted: 'Anúncio excluído.',
    error: 'Erro.',
    confirmTitle: 'Excluir este anúncio?',
    confirmBody: 'Essa ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    ownListing: 'Este anúncio é seu',
    edit: 'Editar',
    pause: 'Pausar',
    reactivate: 'Reativar',
    republish: 'Republicar',
    remove: 'Excluir',
    soldLocked: 'Vendido. Este anúncio fica no seu histórico e não pode ser excluído.',
    saleLocked: 'Este anúncio tem uma venda registrada e não pode ser excluído.',
  },
  en: {
    paused: 'Listing paused.',
    reactivated: 'Listing reactivated.',
    republished: 'Listing republished.',
    deleted: 'Listing deleted.',
    error: 'Error.',
    confirmTitle: 'Delete this listing?',
    confirmBody: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    ownListing: 'This listing is yours',
    edit: 'Edit',
    pause: 'Pause',
    reactivate: 'Reactivate',
    republish: 'Republish',
    remove: 'Delete',
    soldLocked: 'Sold. This listing stays in your history and cannot be deleted.',
    saleLocked: 'This listing has a sale record and cannot be deleted.',
  },
};
function readLocale(): Locale {
  try {
    return window.localStorage.getItem('kitetropos:locale') === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function OwnerControls({ listingId, status, saleRecord = false, compact = false, locale: initialLocale = 'pt' }: { listingId: string; status: string; saleRecord?: boolean; compact?: boolean; locale?: Locale }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  useEffect(() => setLocale(readLocale()), []);
  const t = COPY[locale];

  async function setListingStatus(next: 'active' | 'paused', okMsg = next === 'paused' ? t.paused : t.reactivated) {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? t.error);
      toast.show(okMsg);
      router.refresh(); setBusy(false);
    } catch (e: any) { setErr(e.message); toast.show(e.message, 'err'); setBusy(false); }
  }

  async function remove() {
    const ok = await confirm({ title: t.confirmTitle, body: t.confirmBody, confirmLabel: t.confirmLabel, danger: true });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? t.error);
      toast.show(t.deleted);
      router.push('/conta/anuncios'); // antes ia pra /conta
    } catch (e: any) { setErr(e.message); toast.show(e.message, 'err'); setBusy(false); }
  }

  // §10 — anúncio vendido/com venda registrada é imutável pra exclusão (fica como
  // registro do negócio). Editar/Pausar/Reativar seguem governados pelo status: um kit
  // parcialmente vendido continua ativo e gerenciável na peça que sobrou.
  const locked = saleRecord || status === 'sold';

  return (
    <div style={compact ? { padding: '4px 0 0' } : { border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24 }}>
      {!compact && <div style={{ fontSize: 13, fontWeight: 700, color: color.inkFaint2, marginBottom: 12 }}>{t.ownListing}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {isEditable(status as ListingStatus) && <Link href={`/anuncio/${listingId}/editar`} style={btnPrimary}>{t.edit}</Link>}
        {status === 'active' && <button onClick={() => setListingStatus('paused')} disabled={busy} style={btnOutline}>{t.pause}</button>}
        {status === 'paused' && <button onClick={() => setListingStatus('active')} disabled={busy} style={btnOutline}>{t.reactivate}</button>}
        {status === 'archived' && <button onClick={() => setListingStatus('active', t.republished)} disabled={busy} style={btnOutline}>{t.republish}</button>}
        {!locked && <button onClick={remove} disabled={busy} style={btnDanger}>{t.remove}</button>}
      </div>
      {locked && <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 10, lineHeight: 1.45 }}>{status === 'sold' ? t.soldLocked : t.saleLocked}</div>}
      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
    </div>
  );
}

const base: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, padding: '11px 20px', borderRadius: 11, textDecoration: 'none', cursor: 'pointer', border: 'none' };
const btnPrimary: React.CSSProperties = { ...base, background: color.primary, color: '#fff' };
const btnOutline: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink };
const btnDanger: React.CSSProperties = { ...base, background: '#fff', border: `1.5px solid #f0d4d0`, color: '#b3261e' };
