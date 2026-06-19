'use client';

// Contato estruturado no anúncio: Fazer oferta (valor) | Agendar visita.
// Vendedor aceita → libera o WhatsApp (vem do servidor em initial.whatsapp).
import { useState } from 'react';
import { color, font } from '../lib/tokens';

type State = { offer: { status: string; amount: number | null } | null; visit: { status: string } | null; whatsapp: string | null };
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const STATUS_TXT: Record<string, string> = { pending: 'aguardando o vendedor', accepted: 'aceita', declined: 'recusada' };

export function ContactActions({ listingId, initial }: { listingId: string; initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [showOffer, setShowOffer] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function send(type: 'offer' | 'visit', amountCents?: number) {
    setBusy(type); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: amountCents }) });
      if (res.status === 401) { window.location.href = `/entrar?next=${encodeURIComponent(`/anuncio/${listingId}`)}`; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Erro.');
      if (type === 'offer') setState((s) => ({ ...s, offer: { status: 'pending', amount: amountCents ?? null } }));
      else setState((s) => ({ ...s, visit: { status: 'pending' } }));
      setShowOffer(false); setAmount('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  // Contato já liberado → vai pro WhatsApp.
  if (state.whatsapp) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: color.primary, fontWeight: 600, marginBottom: 8 }}>✓ O vendedor liberou o contato.</div>
        <a href={state.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', textAlign: 'center', background: '#25D366', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Falar no WhatsApp</a>
        <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 8 }}>Combinem preço, visita e o resto por lá.</div>
      </div>
    );
  }

  const offerLabel = state.offer ? `Oferta de ${state.offer.amount != null ? brl(state.offer.amount) : ''} · ${STATUS_TXT[state.offer.status]}` : null;
  const visitLabel = state.visit ? `Visita solicitada · ${STATUS_TXT[state.visit.status]}` : null;

  return (
    <div style={{ marginBottom: 24 }}>
      {!showOffer ? (
        <button onClick={() => setShowOffer(true)} disabled={!!busy} style={btnPrimary}>Fazer oferta</button>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: color.inkFaint }}>R$</span>
            <input autoFocus type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('pt-BR') : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Sua oferta" style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 11, padding: '14px 14px 14px 40px', fontSize: 16, fontWeight: 700, fontFamily: font.sans }} />
          </div>
          <button onClick={() => Number(amount) > 0 && send('offer', Number(amount) * 100)} disabled={busy === 'offer' || !(Number(amount) > 0)} style={{ ...btnPrimary, width: 'auto', padding: '14px 20px' }}>{busy === 'offer' ? '…' : 'Enviar'}</button>
        </div>
      )}
      {offerLabel && <div style={statusLine}>{offerLabel}</div>}

      <button onClick={() => send('visit')} disabled={!!busy || state.visit?.status === 'pending'} style={{ ...btnOutline, marginTop: 10 }}>{busy === 'visit' ? '…' : 'Agendar visita'}</button>
      {visitLabel && <div style={statusLine}>{visitLabel}</div>}

      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
      <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 12 }}>Quando o vendedor aceitar, o WhatsApp dele aparece aqui.</div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { display: 'block', width: '100%', background: color.primary, color: '#fff', border: 'none', textAlign: 'center', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'Archivo',sans-serif" };
const btnOutline: React.CSSProperties = { display: 'block', width: '100%', background: '#fff', color: color.ink, border: `1.5px solid ${color.lineCard}`, textAlign: 'center', padding: 15, borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Archivo',sans-serif" };
const statusLine: React.CSSProperties = { fontSize: 13, color: color.inkMute, marginTop: 8 };
