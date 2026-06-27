'use client';

// Checagem cruzada do negócio + avaliação padronizada + correção/reversão (§11).
// A avaliação só fica liberada (e pública) quando os dois confirmam (deal completed,
// §4). Depois de completed, qualquer parte pode pedir correção da venda (reversão
// bilateral); sem confirmação em 72h o deal vira closed_unconfirmed (cron) e o vendedor
// pode "corrigir e voltar a anunciar".
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { color, font } from '../lib/tokens';
import { useToast } from './Toast';

type Deal = {
  id: string; status: string;
  iAmSeller: boolean; iAmBuyer: boolean; myReviewDone: boolean;
  iOpenedReversal: boolean; reversalReason: string | null;
} | null;

// Critérios padronizados por papel:
const SELLER_TAGS = ['Equipamento como descrito', 'Pontual', 'Comunicação boa', 'Pagamento tranquilo', 'Recomendo']; // comprador avalia o vendedor
const BUYER_TAGS = ['Pontual', 'Comunicação boa', 'Negócio tranquilo', 'Recomendo']; // vendedor avalia o comprador

// Motivos de correção (§11) — valores batem com o enum DisputeReason / a rota.
const REVERSAL_REASONS: [string, string][] = [['devolvido', 'O item foi devolvido'], ['engano', 'Marquei por engano'], ['nao_aconteceu', 'A venda não aconteceu'], ['outro', 'Outro motivo']];
const REASON_LABEL: Record<string, string> = { devolvido: 'item devolvido', engano: 'marcado por engano', nao_aconteceu: 'a venda não aconteceu', outro: 'outro motivo' };

export function DealBox({ requestId, role, deal }: { requestId: string; role: 'seller' | 'buyer'; deal: Deal }) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [reviewSkipped, setReviewSkipped] = useState(false); // §14 "Agora não" — avaliação é opcional
  const [err, setErr] = useState('');
  // ação irreversível aguardando confirmação inline (marcar vendido / confirmar compra / cancelar / corrigir / responder correção)
  const [pending, setPending] = useState<{ label: string; run: () => void } | null>(null);
  // pedido de correção: painel de motivo aberto (§11)
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState('');
  const [reversalNote, setReversalNote] = useState('');
  const router = useRouter();
  const toast = useToast();

  async function call(url: string, body?: any) {
    setBusy(true); setErr(''); setPending(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      if (res.ok) { toast.show('Pronto!'); setReversing(false); setReason(''); setReversalNote(''); router.refresh(); setBusy(false); }
      else { const m = (await res.json().catch(() => ({}))).message ?? 'Erro.'; setErr(m); toast.show(m, 'err'); setBusy(false); }
    } catch { setErr('Sem conexão.'); toast.show('Sem conexão.', 'err'); setBusy(false); }
  }

  const ask = (label: string, run: () => void) => { setErr(''); setPending({ label, run }); };

  const reviewing = role === 'seller' ? 'o comprador' : 'o vendedor';
  const tagOptions = role === 'seller' ? BUYER_TAGS : SELLER_TAGS;
  const toggleTag = (t: string) => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  // --- ação principal por estado do negócio ---
  // 'cancelled' = vendedor desmarcou / comprador negou; volta a se comportar como "sem negócio".
  const noDeal = !deal || deal.status === 'cancelled';
  let confirm: React.ReactNode = null;
  if (noDeal) {
    confirm = role === 'seller'
      ? <>
          {deal?.status === 'cancelled' && <div style={muted}>Venda cancelada. Você pode marcar de novo quando quiser.</div>}
          <button onClick={() => ask('Confirmar que vendeu este item? Isso inicia o negócio com este comprador.', () => call(`/api/requests/${requestId}/sold`))} disabled={busy} style={btn}>Marcar como vendido</button>
        </>
      : <div style={muted}>Quando o vendedor marcar a venda, confirme aqui pra concluir o negócio.</div>;
  } else if (deal!.status === 'completed') {
    confirm = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: color.primary }}>Negócio concluído ✓</div>
        <button onClick={() => { setErr(''); setReversing(true); }} disabled={busy} style={linkBtn}>Solicitar correção da venda</button>
      </div>
    );
  // Sem ramo para 'voided': quando a peça é vendida a outro, o Request do comprador
  // vira 'sold_elsewhere' no mesmo passo, e o DealBox só renderiza para Request
  // 'accepted'. O caso é mostrado pelo badge "Vendido a outro" na linha do pedido.
  } else if (deal!.status === 'seller_confirmed') {
    confirm = role === 'seller'
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={muted}>Você marcou como vendido · aguardando o comprador confirmar.</div>
          <button onClick={() => ask('Cancelar a venda marcada? O negócio volta atrás e você pode marcar de novo.', () => call(`/api/deals/${deal!.id}/cancel`))} disabled={busy} style={btnGhost}>Cancelar venda</button>
        </div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => ask('Confirmar que você comprou? O anúncio será marcado como vendido. Não dá pra desfazer.', () => call(`/api/deals/${deal!.id}/confirm`))} disabled={busy} style={btn}>Confirmar que comprei</button>
          {/* Saída pro comprador marcado por engano: sem isto, só restava esperar 72h
              até o cron encerrar como closed_unconfirmed. Desfaz o negócio e a peça
              volta a ficar disponível (rota /deny → denyPurchase). */}
          <button onClick={() => ask('Marcar que você NÃO comprou? O negócio é desfeito e o anúncio volta a ficar disponível.', () => call(`/api/deals/${deal!.id}/deny`))} disabled={busy} style={btnGhost}>Não comprei</button>
        </div>;
  } else if (deal!.status === 'closed_unconfirmed') {
    // 72h sem o comprador confirmar (cron) → encerrado como vendido. O vendedor corrige
    // sozinho (o comprador nunca confirmou — unilateral).
    confirm = role === 'seller'
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={muted}>Encerrado como vendido. O comprador não confirmou a tempo. Não conta como venda nem libera avaliação.</div>
          <button onClick={() => ask('Corrigir e voltar a anunciar? O anúncio volta a ficar à venda e este negócio é encerrado.', () => call(`/api/deals/${deal!.id}/correct`))} disabled={busy} style={btnGhost}>Corrigir e voltar a anunciar</button>
        </div>
      : <div style={muted}>O vendedor encerrou esta venda como concluída. Você não confirmou a compra.</div>;
  } else if (deal!.status === 'reversal_requested') {
    confirm = deal!.iOpenedReversal
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={muted}>Você pediu a correção desta venda · aguardando a outra parte responder.</div>
          <button onClick={() => ask('Desistir do pedido de correção? A venda volta a contar como concluída.', () => call(`/api/deals/${deal!.id}/reversal`, { op: 'cancel' }))} disabled={busy} style={btnGhost}>Desistir da correção</button>
        </div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={muted}>A outra parte pediu a correção desta venda{deal!.reversalReason ? ` (${REASON_LABEL[deal!.reversalReason] ?? deal!.reversalReason})` : ''}.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => ask('Confirmar a correção? A venda volta atrás e o item volta a ficar disponível.', () => call(`/api/deals/${deal!.id}/reversal`, { op: 'respond', accept: true }))} disabled={busy} style={{ ...btn, marginTop: 0, flex: 1 }}>Confirmar correção</button>
            <button onClick={() => ask('Não concordar com a correção? A moderação vai analisar o caso.', () => call(`/api/deals/${deal!.id}/reversal`, { op: 'respond', accept: false }))} disabled={busy} style={{ ...btnGhost, flex: 1 }}>Não concordo</button>
          </div>
        </div>;
  } else if (deal!.status === 'disputed') {
    confirm = <div style={muted}>Vocês não chegaram a um acordo sobre a correção. A moderação vai analisar e decidir.</div>;
  } else if (deal!.status === 'reversed') {
    confirm = <div style={muted}>Venda corrigida. Voltou atrás. O vínculo com esta compra foi desfeito.</div>;
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

  // painel de motivo do pedido de correção (§11)
  const reversalPanel = reversing && deal ? (
    <div style={{ background: '#f3f1e9', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: color.ink }}>Solicitar correção da venda</div>
      <div style={{ fontSize: 12, color: color.inkMute, lineHeight: 1.4 }}>A outra parte precisa confirmar. Se não concordar, a moderação decide.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {REVERSAL_REASONS.map(([val, label]) => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: color.ink, cursor: 'pointer' }}>
            <input type="radio" name={`reversal-reason-${deal.id}`} checked={reason === val} onChange={() => setReason(val)} disabled={busy} />
            {label}
          </label>
        ))}
      </div>
      <textarea value={reversalNote} onChange={(e) => setReversalNote(e.target.value)} placeholder="Detalhes (opcional)" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: font.sans, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => reason && call(`/api/deals/${deal.id}/reversal`, { op: 'request', reason, description: reversalNote || undefined })} disabled={busy || !reason} style={{ ...btn, marginTop: 0, flex: 1, opacity: !reason ? 0.5 : 1 }}>Enviar pedido</button>
        <button onClick={() => { setReversing(false); setReason(''); setReversalNote(''); setErr(''); }} disabled={busy} style={{ ...btnGhost, flex: 1 }}>Voltar</button>
      </div>
    </div>
  ) : null;

  // --- avaliação padronizada — SÓ em completed (§4). Em reversal_requested/disputed a
  // review existente fica OCULTA; em reversed, oculta permanente. ---
  let review: React.ReactNode = null;
  if (deal && deal.status === 'completed') {
    review = deal.myReviewDone
      ? <div style={{ fontSize: 12.5, color: color.primary, fontWeight: 600 }}>Avaliação enviada ✓ · já está pública</div>
      : reviewSkipped
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <div style={muted}>Avaliação é opcional. Você pode avaliar quando quiser.</div>
          <button onClick={() => setReviewSkipped(false)} disabled={busy} style={btnGhost}>Avaliar agora</button>
        </div>
      : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f1ec', color: '#15463b', fontSize: 13, fontWeight: 600, padding: '9px 13px', borderRadius: 10, marginBottom: 14 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary, flex: 'none' }} />Negócio concluído! Avaliação importa porque constrói a reputação da comunidade.</div>
          <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Avalie {reviewing}</div>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
            {[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={`${n} de 5 estrelas`} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, lineHeight: 1, color: n <= rating ? color.primary : color.lineInput, padding: 0 }}>★</button>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {tagOptions.map((t) => {
              const on = tags.includes(t);
              return <button key={t} onClick={() => toggleTag(t)} style={{ fontFamily: font.sans, fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', background: on ? color.primary : '#fff', color: on ? '#fff' : color.ink, border: `1.5px solid ${on ? color.primary : color.lineInput}` }}>{t}</button>;
            })}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentário (opcional)" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: font.sans, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <button onClick={() => rating > 0 && call(`/api/deals/${deal.id}/review`, { rating, tags, comment: comment || undefined })} disabled={busy || rating === 0} style={{ ...btn, marginTop: 0 }}>Enviar avaliação</button>
            <button onClick={() => setReviewSkipped(true)} disabled={busy} style={linkBtn}>Agora não</button>
          </div>
        </div>
      );
  } else if (deal && deal.myReviewDone && (deal.status === 'reversal_requested' || deal.status === 'disputed')) {
    review = <div style={muted}>Sua avaliação fica oculta enquanto a correção está em análise.</div>;
  } else if (deal && deal.myReviewDone && deal.status === 'reversed') {
    review = <div style={muted}>Sua avaliação foi ocultada porque a venda foi corrigida.</div>;
  }

  // --- mensagem de importância (só nos estados ativos/concluído; some quando avaliado) ---
  const done = deal?.status === 'completed' && deal.myReviewDone;
  const showNote = !done && (noDeal || deal!.status === 'seller_confirmed' || deal!.status === 'completed');
  const note = showNote ? (
    <div style={{ fontSize: 12, lineHeight: 1.5, color: color.inkMute, background: '#f3f1e9', borderRadius: 9, padding: '9px 12px' }}>
      Confirmar a compra/venda e avaliar fortalece os dois perfis. Quem tem histórico de negócios vende mais rápido e passa mais confiança.
    </div>
  ) : null;

  // banner "contato liberado" só nos estados de negociação viva (não nos encerrados/correção).
  const liberado = noDeal || deal!.status === 'seller_confirmed';
  const head = reversing ? reversalPanel : pending ? confirmBar : confirm;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.line}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {liberado && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: color.primary }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary, flex: 'none' }} />Aceito. Contato liberado</div>}
      {head}
      {!reversing && review && <div style={confirm ? { paddingTop: 12, borderTop: `1px solid ${color.line}` } : undefined}>{review}</div>}
      {note}
      {err && <div style={errStyle}>{err}</div>}
    </div>
  );
}

const btn: React.CSSProperties = { background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 4 };
const btnGhost: React.CSSProperties = { background: '#fff', color: color.ink, border: `1.5px solid ${color.lineInput}`, borderRadius: 10, padding: '10px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const linkBtn: React.CSSProperties = { alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: color.inkMute, fontSize: 12.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' };
const muted: React.CSSProperties = { fontSize: 12.5, color: color.inkFaint2 };
const errStyle: React.CSSProperties = { color: '#b3261e', fontSize: 12.5 };
