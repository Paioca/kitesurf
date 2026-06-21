'use client';

// Checagem cruzada do negócio + avaliação padronizada.
// Avaliar é liberado assim que o negócio existe (vendedor marcou vendido) — não trava
// no aceite. A avaliação só fica PÚBLICA quando os dois confirmam (deal completed).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { color, font } from '../lib/tokens';
import { useToast } from './Toast';

type Deal = { id: string; status: string; iAmSeller: boolean; iAmBuyer: boolean; myReviewDone: boolean } | null;

// Critérios padronizados por papel:
const SELLER_TAGS = ['Equipamento como descrito', 'Pontual', 'Comunicação boa', 'Pagamento tranquilo', 'Recomendo']; // comprador avalia o vendedor
const BUYER_TAGS = ['Pontual', 'Comunicação boa', 'Negócio tranquilo', 'Recomendo']; // vendedor avalia o comprador

export function DealBox({ requestId, role, deal }: { requestId: string; role: 'seller' | 'buyer'; deal: Deal }) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  // ação irreversível aguardando confirmação inline (marcar vendido / confirmar compra / cancelar)
  const [pending, setPending] = useState<{ label: string; run: () => void } | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function call(url: string, body?: any) {
    setBusy(true); setErr(''); setPending(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      if (res.ok) { toast.show('Pronto!'); router.refresh(); setBusy(false); }
      else { const m = (await res.json().catch(() => ({}))).message ?? 'Erro.'; setErr(m); toast.show(m, 'err'); setBusy(false); }
    } catch { setErr('Sem conexão.'); toast.show('Sem conexão.', 'err'); setBusy(false); }
  }

  const ask = (label: string, run: () => void) => { setErr(''); setPending({ label, run }); };

  const reviewing = role === 'seller' ? 'o comprador' : 'o vendedor';
  const tagOptions = role === 'seller' ? BUYER_TAGS : SELLER_TAGS;
  const toggleTag = (t: string) => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  // --- confirmação (marcar vendido / confirmar compra) ---
  // 'cancelled' = vendedor desmarcou; volta a se comportar como "sem negócio".
  const noDeal = !deal || deal.status === 'cancelled';
  let confirm: React.ReactNode = null;
  if (noDeal) {
    confirm = role === 'seller'
      ? <>
          {deal?.status === 'cancelled' && <div style={muted}>Venda cancelada. Você pode marcar de novo quando quiser.</div>}
          <button onClick={() => ask('Confirmar que vendeu este item? Isso inicia o negócio com este comprador.', () => call(`/api/requests/${requestId}/sold`))} disabled={busy} style={btn}>Marcar como vendido</button>
        </>
      : <div style={muted}>Quando o vendedor marcar a venda, confirme aqui pra concluir o negócio.</div>;
  } else if (deal.status === 'completed') {
    confirm = <div style={{ fontSize: 13, fontWeight: 700, color: color.primary }}>Negócio concluído ✓</div>;
  } else if (deal.status === 'seller_confirmed') {
    confirm = role === 'seller'
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={muted}>Você marcou como vendido · aguardando o comprador confirmar.</div>
          <button onClick={() => ask('Cancelar a venda marcada? O negócio volta atrás e você pode marcar de novo.', () => call(`/api/deals/${deal.id}/cancel`))} disabled={busy} style={btnGhost}>Cancelar venda</button>
        </div>
      : <button onClick={() => ask('Confirmar que você comprou? O anúncio será marcado como vendido — não dá pra desfazer.', () => call(`/api/deals/${deal.id}/confirm`))} disabled={busy} style={btn}>Confirmar que comprei</button>;
  }

  // barra de confirmação inline pra ações irreversíveis
  const confirmBar = pending ? (
    <div style={{ background: '#f3f1e9', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: color.ink, lineHeight: 1.4 }}>{pending.label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => pending.run()} disabled={busy} style={{ ...btn, marginTop: 0, flex: 1 }}>Sim, confirmar</button>
        <button onClick={() => setPending(null)} disabled={busy} style={{ ...btnGhost, flex: 1 }}>Voltar</button>
      </div>
    </div>
  ) : null;

  // --- avaliação padronizada (liberada assim que o deal existe; não em cancelado) ---
  let review: React.ReactNode = null;
  if (deal && deal.status !== 'cancelled') {
    if (deal.myReviewDone) {
      review = <div style={{ fontSize: 12.5, color: color.primary, fontWeight: 600 }}>Avaliação enviada ✓ {deal.status === 'completed' ? '· já está pública' : '· fica pública quando os dois confirmarem'}</div>;
    } else {
      review = (
        <div>
          {deal.status === 'completed'
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f1ec', color: '#15463b', fontSize: 13, fontWeight: 600, padding: '9px 13px', borderRadius: 10, marginBottom: 14 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary, flex: 'none' }} />Negócio concluído! Avaliação importa — é o que constrói a reputação da comunidade.</div>
            : null}
          <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Avalie {reviewing}</div>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
            {[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} de 5 estrelas`} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, lineHeight: 1, color: n <= rating ? color.accent : color.lineInput, padding: 0 }}>★</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {tagOptions.map((t) => {
              const on = tags.includes(t);
              return <button key={t} onClick={() => toggleTag(t)} style={{ fontFamily: font.sans, fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', background: on ? color.primary : '#fff', color: on ? '#fff' : color.ink, border: `1.5px solid ${on ? color.primary : color.lineInput}` }}>{t}</button>;
            })}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentário (opcional)" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: font.sans, resize: 'vertical' }} />
          <button onClick={() => rating > 0 && call(`/api/deals/${deal.id}/review`, { rating, tags, comment: comment || undefined })} disabled={busy || rating === 0} style={btn}>Enviar avaliação</button>
        </div>
      );
    }
  }

  // --- mensagem de importância (some quando tudo está concluído e avaliado) ---
  const done = deal?.status === 'completed' && deal.myReviewDone;
  const note = !done ? (
    <div style={{ fontSize: 12, lineHeight: 1.5, color: color.inkMute, background: '#f3f1e9', borderRadius: 9, padding: '9px 12px' }}>
      Confirmar a compra/venda e avaliar fortalece os dois perfis — quem tem histórico de negócios vende mais rápido e passa mais confiança.
    </div>
  ) : null;

  const liberado = !deal || deal.status !== 'completed';

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.line}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {liberado && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: color.primary }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary, flex: 'none' }} />Aceito — contato liberado</div>}
      {pending ? confirmBar : confirm}
      {review && <div style={confirm ? { paddingTop: 12, borderTop: `1px solid ${color.line}` } : undefined}>{review}</div>}
      {note}
      {err && <div style={errStyle}>{err}</div>}
    </div>
  );
}

const btn: React.CSSProperties = { background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 4 };
const btnGhost: React.CSSProperties = { background: '#fff', color: color.ink, border: `1.5px solid ${color.lineInput}`, borderRadius: 10, padding: '10px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const muted: React.CSSProperties = { fontSize: 12.5, color: color.inkFaint2 };
const errStyle: React.CSSProperties = { color: '#b3261e', fontSize: 12.5 };
