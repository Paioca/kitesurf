'use client';

// Contato estruturado no anúncio: Pedir visita | Fazer oferta (valor).
// Venda por componente: 1 alvo = UI direta; 2+ (kit com peça avulsa) = seletor.
import { useEffect, useState } from 'react';
import { color, font } from '../lib/tokens';
import type { Component } from '../lib/components';
import { CancelRequestButton } from './CancelRequestButton';

const PENDING_KEY = (id: string) => `vaya:pending-request:${id}`;

type State = { offer: { id?: string; status: string; amount: number | null } | null; visit: { id?: string; status: string } | null; whatsapp: string | null };
export type Target = { component: Component; label: string; price: number; summary: string; itemNoun: string };
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ACTIVE_STATUSES = new Set(['pending', 'accepted']);
const activeRequestKind = (s: State) => (
  s.offer && ACTIVE_STATUSES.has(s.offer.status) ? 'offer'
  : s.visit && ACTIVE_STATUSES.has(s.visit.status) ? 'visit'
  : null
);

export function ContactActions({ listingId, targets, stateByComponent }: { listingId: string; targets: Target[]; stateByComponent: Record<Component, State> }) {
  const [stateMap, setStateMap] = useState(stateByComponent);
  const [sel, setSel] = useState(0);
  const [showOffer, setShowOffer] = useState(false);
  const [confirmVisit, setConfirmVisit] = useState(false);
  const [ciente, setCiente] = useState(false); // gate anti-spam do design
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const target = targets[sel];
  const component = target.component;
  const state = stateMap[component];
  const activeKind = activeRequestKind(state);
  // Passo da jornada (visual, derivado do estado): 0 interesse · 1 contato · 2 negócio.
  const journeyStep = state.whatsapp ? 2 : activeKind ? 1 : 0;
  const { visitSummary, itemNoun } = { visitSummary: target.summary, itemNoun: target.itemNoun };

  const switchTarget = (i: number) => { setSel(i); setShowOffer(false); setConfirmVisit(false); setCiente(false); setAmount(''); setErr(''); };

  // Retoma a oferta/visita digitada antes do login (no alvo certo). NÃO reenvia
  // sozinho — restaura o formulário pra um clique explícito.
  useEffect(() => {
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(PENDING_KEY(listingId)); } catch {}
    if (!raw) return;
    try { sessionStorage.removeItem(PENDING_KEY(listingId)); } catch {}
    let pend: { type: 'offer' | 'visit'; amount: number | null; component?: Component };
    try { pend = JSON.parse(raw); } catch { return; }
    const i = targets.findIndex((t) => t.component === (pend.component ?? 'conjunto'));
    if (i < 0) return; // alvo não está mais à venda
    setSel(i);
    const st = stateMap[targets[i].component];
    if (activeRequestKind(st)) return;
    if (pend.type === 'offer' && !st.offer) {
      if (pend.amount != null) setAmount(String(Math.round(pend.amount / 100)));
      setCiente(true);
      setShowOffer(true);
    } else if (pend.type === 'visit' && !st.visit) {
      setCiente(true);
      setConfirmVisit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(type: 'offer' | 'visit', amountCents?: number) {
    setBusy(type); setErr('');
    try {
      const res = await fetch(`/api/listings/${listingId}/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: amountCents, component }) });
      if (res.status === 401) {
        try { sessionStorage.setItem(PENDING_KEY(listingId), JSON.stringify({ type, amount: amountCents ?? null, component })); } catch {}
        window.location.href = `/entrar?next=${encodeURIComponent(`/anuncio/${listingId}`)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Erro.');
      setStateMap((m) => ({
        ...m,
        [component]: type === 'offer'
          ? { ...m[component], offer: { id: data.id, status: 'pending', amount: amountCents ?? null }, visit: null }
          : { ...m[component], visit: { id: data.id, status: 'pending' }, offer: null },
      }));
      setShowOffer(false); setConfirmVisit(false); setCiente(false); setAmount('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  function clearRequest(type: 'offer' | 'visit') {
    setStateMap((m) => ({
      ...m,
      [component]: { ...m[component], [type]: null },
    }));
  }

  const selector = targets.length > 1 ? (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
      {targets.map((t, i) => (
        <button key={t.component} onClick={() => switchTarget(i)} style={{ flex: 'none', fontFamily: font.sans, fontSize: 13, fontWeight: 700, padding: '9px 14px', borderRadius: 999, cursor: 'pointer', background: i === sel ? color.primary : '#fff', color: i === sel ? '#fff' : color.ink, border: `1.5px solid ${i === sel ? color.primary : color.lineInput}` }}>
          {t.label} · {brl(t.price)}
        </button>
      ))}
    </div>
  ) : null;

  // Contato já liberado pro alvo selecionado → vai pro WhatsApp.
  if (state.whatsapp) {
    return (
      <div style={{ marginBottom: 24 }}>
        {selector}
        <JourneyStepper step={journeyStep} />
        <div style={{ fontSize: 13, color: color.primary, fontWeight: 600, marginBottom: 8 }}>✓ Contato liberado{targets.length > 1 ? ` (${target.label.toLowerCase()})` : ''}.</div>
        <a href={state.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', textAlign: 'center', background: '#25D366', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Conversar pelo WhatsApp</a>
        <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 8 }}>Agora vocês podem combinar retirada, envio e pagamento diretamente.</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {selector}
      <JourneyStepper step={journeyStep} />
      {!activeKind && (!confirmVisit ? (
        // §14 — "Quero ver pessoalmente" (não "Agendar visita": não há calendário; não
        // "Compartilhar WhatsApp": descreve a intenção, não o mecanismo).
        (<button onClick={() => { setConfirmVisit(true); setShowOffer(false); setCiente(false); }} disabled={!!busy || state.visit?.status === 'pending'} style={btnPrimary}>{busy === 'visit' ? '…' : 'Quero ver de perto'}</button>)
      ) : (
        <div style={{ border: `1.5px solid ${color.lineCard}`, borderRadius: 13, padding: 15, background: '#fff' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: color.ink }}>
            Seu WhatsApp será compartilhado com o vendedor para vocês combinarem a visita. {itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1)} é: <strong>{visitSummary}</strong>.
          </div>
          <WarnBox>Combine só se for comparecer. Pedir pra ver só pra perguntar o que já está no anúncio, no-show ou spam levam a bloqueio.</WarnBox>
          <CienteCheck on={ciente} onToggle={() => setCiente((v) => !v)} label="Estou ciente e pretendo comparecer à visita." />
          <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
            <button onClick={() => { setConfirmVisit(false); setCiente(false); }} disabled={busy === 'visit'} style={{ ...btnOutline, marginTop: 0, width: 'auto', padding: '13px 18px' }}>Voltar</button>
            <button onClick={() => ciente && send('visit')} disabled={busy === 'visit' || !ciente} style={{ ...btnPrimary, flex: 1, ...(!ciente ? disabledBtn : {}) }}>{busy === 'visit' ? '…' : 'Enviar pedido e compartilhar WhatsApp'}</button>
          </div>
        </div>
      ))}
      {state.visit && (
        <>
          <SentBox title="Pedido enviado ao vendedor" status={state.visit.status} />
          {state.visit.status === 'pending' && state.visit.id && <CancelRequestButton requestId={state.visit.id} type="visit" onCancelled={() => clearRequest('visit')} />}
        </>
      )}

      {!activeKind && (!showOffer ? (
        <button onClick={() => { setShowOffer(true); setConfirmVisit(false); setCiente(false); }} disabled={!!busy} style={{ ...btnOutline, marginTop: 10 }}>Fazer uma oferta antes</button>
      ) : (
        <div style={{ marginTop: 10, border: `1.5px solid ${color.lineCard}`, borderRadius: 13, padding: 15, background: '#fff' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: color.inkFaint }}>R$</span>
            <input autoFocus type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('pt-BR') : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Sua oferta" style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 11, padding: '14px 14px 14px 40px', fontSize: 16, fontWeight: 700, fontFamily: font.sans }} />
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: color.ink }}>
            {itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1)} é: <strong>{visitSummary}</strong>.
          </div>
          <WarnBox>Oferta é compromisso real. Proposta falsa, spam ou no-show levam a bloqueio na plataforma.</WarnBox>
          <CienteCheck on={ciente} onToggle={() => setCiente((v) => !v)} label="Estou ciente e quero enviar minha oferta de verdade." />
          <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
            <button onClick={() => { setShowOffer(false); setAmount(''); setCiente(false); }} disabled={busy === 'offer'} style={{ ...btnOutline, marginTop: 0, width: 'auto', padding: '13px 18px' }}>Voltar</button>
            <button onClick={() => ciente && Number(amount) > 0 && send('offer', Number(amount) * 100)} disabled={busy === 'offer' || !ciente || !(Number(amount) > 0)} style={{ ...btnPrimary, flex: 1, ...((!ciente || !(Number(amount) > 0)) ? disabledBtn : {}) }}>{busy === 'offer' ? '…' : 'Confirmar oferta'}</button>
          </div>
        </div>
      ))}
      {state.offer && (
        <>
          <SentBox title={state.offer.amount != null ? `Oferta de ${brl(state.offer.amount)} enviada` : 'Oferta enviada'} status={state.offer.status} />
          {state.offer.status === 'pending' && state.offer.id && <CancelRequestButton requestId={state.offer.id} type="offer" onCancelled={() => clearRequest('offer')} />}
        </>
      )}

      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
      <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 14, lineHeight: 1.5, background: '#f3f1e9', borderRadius: 10, padding: '11px 13px' }}>
        <strong style={{ color: color.ink }}>Como funciona:</strong> O vendedor recebe seu pedido com o seu contato. Se ele aceitar, o WhatsApp dele também é liberado para você.
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { display: 'block', width: '100%', background: color.primary, color: '#fff', border: 'none', textAlign: 'center', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "var(--font-archivo),'Archivo',sans-serif" };
const btnOutline: React.CSSProperties = { display: 'block', width: '100%', background: '#fff', color: color.ink, border: `1.5px solid ${color.lineCard}`, textAlign: 'center', padding: 15, borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: "var(--font-archivo),'Archivo',sans-serif" };
const disabledBtn: React.CSSProperties = { background: '#dfe3df', color: color.inkFaint2, cursor: 'not-allowed' };

// Stepper da jornada (Lifestyle): Interesse → Contato → Negócio em losangos,
// o passo atual destacado. Visual no lugar de só texto (ajuda a ler onde se está).
function JourneyStepper({ step }: { step: number }) {
  const steps = ['Interesse', 'Contato', 'Negociação'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
      {steps.map((label, i) => {
        const done = i < step;
        const active = i === step;
        const on = done || active;
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < steps.length - 1 && <div style={{ position: 'absolute', top: 13, left: '50%', width: '100%', height: 2, background: i < step ? color.primary : '#e6dfd0', zIndex: 0 }} />}
            <div style={{ position: 'relative', zIndex: 1, width: active ? 28 : 26, height: active ? 28 : 26, transform: 'rotate(45deg)', borderRadius: 6, background: on ? color.primary : '#fff', border: on ? 'none' : `1.5px solid ${color.lineInput}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? '0 4px 12px rgba(20,72,62,0.22)' : 'none' }}>
              <span style={{ transform: 'rotate(-45deg)', color: on ? '#fff' : color.inkFaint2, fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{done ? '✓' : i + 1}</span>
            </div>
            <span style={{ marginTop: 9, fontSize: 11, fontWeight: on ? 800 : 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: on ? color.primary : color.inkFaint2 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Caixa de aviso (vermelho do design — anti-spam).
function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11, background: '#fbeae4', border: '1px solid #f0c9bd', borderRadius: 12, padding: '13px 15px', marginTop: 11 }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, background: '#c0492f', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>!</span>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#9a5040', margin: 0 }}>{children}</p>
    </div>
  );
}

// Checkbox "estou ciente" que destrava o confirmar.
function CienteCheck({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} aria-pressed={on} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%', marginTop: 16, fontFamily: "var(--font-archivo),'Archivo',sans-serif" }}>
      <span style={{ width: 21, height: 21, borderRadius: 7, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, background: on ? color.primary : '#fff', border: `1.5px solid ${on ? color.primary : '#cbc3b2'}` }}>{on && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}</span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: color.inkSoft }}>{label}</span>
    </button>
  );
}

// Status destacado do pedido enviado (pendente / recusado).
function SentBox({ title, status }: { title: string; status: string }) {
  const declined = status === 'declined';
  return (
    <div style={{ marginTop: 10, background: declined ? '#fdecea' : '#e8f1ec', border: `1px solid ${declined ? '#f3cdc8' : '#cfe2d8'}`, borderRadius: 12, padding: '13px 15px', display: 'flex', gap: 11 }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, flex: 'none', background: declined ? '#b3261e' : color.primary, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{declined ? '✕' : '✓'}</span>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: declined ? '#b3261e' : color.primary }}>{title}</div>
        <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 3, lineHeight: 1.45 }}>{declined ? 'O vendedor recusou desta vez.' : 'Quando o vendedor aceitar, o contato dele aparece aqui para vocês combinarem pelo WhatsApp.'}</div>
        {!declined && <a href="/pedidos?tab=sent" style={{ display: 'inline-flex', marginTop: 8, color: color.primary, fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>Ver em minhas negociações</a>}
      </div>
    </div>
  );
}
