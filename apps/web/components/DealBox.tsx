'use client';

// Checagem cruzada do negócio (a partir de um pedido aceito): vendedor marca
// "vendido" → comprador confirma "comprei" → os dois avaliam. Alimenta a reputação.
import { useState } from 'react';
import { color, font } from '../lib/tokens';

type Deal = { id: string; status: string; iAmSeller: boolean; iAmBuyer: boolean; myReviewDone: boolean } | null;

export function DealBox({ requestId, role, deal }: { requestId: string; role: 'seller' | 'buyer'; deal: Deal }) {
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');

  async function call(url: string, body?: any) {
    setBusy(true); setErr('');
    try {
      const res = await fetch(url, { method: 'POST', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      if (res.ok) window.location.reload();
      else { setErr((await res.json().catch(() => ({}))).message ?? 'Erro.'); setBusy(false); }
    } catch { setErr('Sem conexão.'); setBusy(false); }
  }

  const Wrap = ({ children }: { children: React.ReactNode }) => <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.line}` }}>{children}</div>;

  if (deal?.status === 'completed') {
    if (deal.myReviewDone) return <Wrap><div style={{ fontSize: 13, color: color.primary, fontWeight: 600 }}>Negócio fechado · avaliação enviada ✓</div></Wrap>;
    return (
      <Wrap>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Negócio fechado — avalie {role === 'seller' ? 'o comprador' : 'o vendedor'}:</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, color: n <= rating ? '#e6a817' : '#d9d2c2', padding: 0 }}>★</button>)}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentário (opcional)" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 10, padding: 10, fontSize: 14, fontFamily: font.sans, resize: 'vertical' }} />
        <button onClick={() => rating > 0 && call(`/api/deals/${deal.id}/review`, { rating, comment: comment || undefined })} disabled={busy || rating === 0} style={btn}>Enviar avaliação</button>
        {err && <div style={errStyle}>{err}</div>}
      </Wrap>
    );
  }

  if (role === 'seller') {
    if (deal?.status === 'seller_confirmed') return <Wrap><div style={muted}>Você marcou como vendido · aguardando o comprador confirmar.</div></Wrap>;
    return <Wrap><button onClick={() => call(`/api/requests/${requestId}/sold`)} disabled={busy} style={btn}>Marcar como vendido</button>{err && <div style={errStyle}>{err}</div>}</Wrap>;
  }

  // comprador
  if (deal?.status === 'seller_confirmed') return <Wrap><button onClick={() => call(`/api/deals/${deal.id}/confirm`)} disabled={busy} style={btn}>Confirmar que comprei</button>{err && <div style={errStyle}>{err}</div>}</Wrap>;
  return <Wrap><div style={muted}>Quando o vendedor marcar a venda, confirme aqui pra liberar a avaliação.</div></Wrap>;
}

const btn: React.CSSProperties = { background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 4 };
const muted: React.CSSProperties = { fontSize: 12.5, color: color.inkFaint2 };
const errStyle: React.CSSProperties = { color: '#b3261e', fontSize: 12.5, marginTop: 8 };
