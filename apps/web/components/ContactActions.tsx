'use client';

// Contato estruturado no anúncio: Fazer oferta (valor) | Agendar visita.
// Vendedor aceita → libera o WhatsApp (vem do servidor em initial.whatsapp).
import { useState } from 'react';
import { color, font } from '../lib/tokens';

type State = { offer: { status: string; amount: number | null } | null; visit: { status: string } | null; whatsapp: string | null };
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContactActions({ listingId, initial, visitSummary = '', itemNoun = 'o item' }: { listingId: string; initial: State; visitSummary?: string; itemNoun?: string }) {
  const [state, setState] = useState<State>(initial);
  const [showOffer, setShowOffer] = useState(false);
  const [confirmVisit, setConfirmVisit] = useState(false);
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
      setShowOffer(false); setConfirmVisit(false); setAmount('');
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

  return (
    <div style={{ marginBottom: 24 }}>
      {!showOffer ? (
        <button onClick={() => setShowOffer(true)} disabled={!!busy} style={btnPrimary}>Fazer oferta</button>
      ) : (
        <div style={{ border: `1.5px solid ${color.lineCard}`, borderRadius: 13, padding: 15, background: '#fff' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: color.inkFaint }}>R$</span>
            <input autoFocus type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('pt-BR') : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Sua oferta" style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 11, padding: '14px 14px 14px 40px', fontSize: 16, fontWeight: 700, fontFamily: font.sans }} />
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: color.ink }}>
            Estou ciente de que {itemNoun} é: <strong>{visitSummary}</strong>. E faço esta oferta com intenção real de comprar.
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8a5a1f', background: '#fdf0e1', borderRadius: 9, padding: '9px 12px', marginTop: 11 }}>
            Evite fazer ofertas sem interesse real de compra. Se for reportado como spam, você pode ser banido.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
            <button onClick={() => { setShowOffer(false); setAmount(''); }} disabled={busy === 'offer'} style={{ ...btnOutline, marginTop: 0, width: 'auto', padding: '13px 18px' }}>Voltar</button>
            <button onClick={() => Number(amount) > 0 && send('offer', Number(amount) * 100)} disabled={busy === 'offer' || !(Number(amount) > 0)} style={{ ...btnPrimary, flex: 1 }}>{busy === 'offer' ? '…' : 'Confirmar oferta'}</button>
          </div>
        </div>
      )}
      {state.offer && <SentBox title={state.offer.amount != null ? `Oferta de ${brl(state.offer.amount)} enviada` : 'Oferta enviada'} status={state.offer.status} />}

      {!confirmVisit ? (
        <button onClick={() => setConfirmVisit(true)} disabled={!!busy || state.visit?.status === 'pending'} style={{ ...btnOutline, marginTop: 10 }}>{busy === 'visit' ? '…' : 'Agendar visita'}</button>
      ) : (
        <div style={{ marginTop: 10, border: `1.5px solid ${color.lineCard}`, borderRadius: 13, padding: 15, background: '#fff' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: color.ink }}>
            Estou ciente de que {itemNoun} é: <strong>{visitSummary}</strong>. E estou solicitando um agendamento para ir ver {itemNoun} pessoalmente.
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8a5a1f', background: '#fdf0e1', borderRadius: 9, padding: '9px 12px', marginTop: 11 }}>
            Evite chamar só pra perguntar o que já está no anúncio. Se for reportado como spam, você pode ser banido.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
            <button onClick={() => setConfirmVisit(false)} disabled={busy === 'visit'} style={{ ...btnOutline, marginTop: 0, width: 'auto', padding: '13px 18px' }}>Voltar</button>
            <button onClick={() => send('visit')} disabled={busy === 'visit'} style={{ ...btnPrimary, flex: 1 }}>{busy === 'visit' ? '…' : 'Confirmar agendamento'}</button>
          </div>
        </div>
      )}
      {state.visit && <SentBox title="Visita solicitada" status={state.visit.status} />}

      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
      <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 14, lineHeight: 1.5, background: '#f3f1e9', borderRadius: 10, padding: '11px 13px' }}>
        <strong style={{ color: color.ink }}>O que acontece:</strong> o vendedor é avisado na hora por SMS com o seu interesse e o seu contato — ele pode te chamar direto no WhatsApp. Se ele aceitar por aqui, o WhatsApp dele também aparece pra você.
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { display: 'block', width: '100%', background: color.primary, color: '#fff', border: 'none', textAlign: 'center', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'Archivo',sans-serif" };
const btnOutline: React.CSSProperties = { display: 'block', width: '100%', background: '#fff', color: color.ink, border: `1.5px solid ${color.lineCard}`, textAlign: 'center', padding: 15, borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Archivo',sans-serif" };

// Status destacado do pedido enviado (pendente / recusado).
function SentBox({ title, status }: { title: string; status: string }) {
  const declined = status === 'declined';
  return (
    <div style={{ marginTop: 10, background: declined ? '#fdecea' : '#e8f1ec', border: `1px solid ${declined ? '#f3cdc8' : '#cfe2d8'}`, borderRadius: 12, padding: '13px 15px', display: 'flex', gap: 11 }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, flex: 'none', background: declined ? '#b3261e' : color.primary, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{declined ? '✕' : '✓'}</span>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: declined ? '#b3261e' : color.primary }}>{title}</div>
        <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 3, lineHeight: 1.45 }}>{declined ? 'O vendedor recusou desta vez.' : 'Aguardando o vendedor aceitar. Quando ele aceitar, o WhatsApp dele aparece aqui.'}</div>
      </div>
    </div>
  );
}
