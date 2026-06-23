'use client';

// Fila de DISPUTAS de venda (§11) — separada das denúncias (Report). Cada disputa
// chegou aqui porque a contraparte recusou um pedido de correção (Deal disputed +
// DealDispute under_review). O admin mantém a venda (uphold → completed) ou reverte
// (reverse → reversed, peça volta a paused). A trilha fica na própria DealDispute.
import { useState } from 'react';
import { color, font } from '../lib/tokens';
import { useToast } from './Toast';

type Dispute = {
  id: string; dealId: string; listingId: string; listingTitle: string; component: string;
  reason: string; description: string | null;
  openedById: string; openedBy: string; counterpartyId: string; counterparty: string;
  createdAt: string;
};

const REASON_LABEL: Record<string, string> = { devolvido: 'Item devolvido', engano: 'Marcado por engano', nao_aconteceu: 'A venda não aconteceu', outro: 'Outro motivo' };
const COMP_LABEL: Record<string, string> = { conjunto: 'Conjunto', kite: 'Kite', barra: 'Barra' };

export function DisputeList({ disputes: initial }: { disputes: Dispute[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: 'uphold' | 'reverse' } | null>(null);
  const [note, setNote] = useState('');
  const toast = useToast();

  async function resolve(d: Dispute, action: 'uphold' | 'reverse') {
    setBusy(d.id);
    try {
      const res = await fetch(`/api/disputes/${d.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, resolution: note || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.show(data.message ?? 'Erro.', 'err'); return; }
      toast.show(action === 'reverse' ? 'Venda revertida.' : 'Venda mantida.');
      setItems((xs) => xs.filter((x) => x.id !== d.id)); // resolvida → sai da fila
      setConfirm(null); setNote('');
    } catch { toast.show('Sem conexão.', 'err'); } finally { setBusy(''); }
  }

  if (!items.length) return <div style={{ color: color.inkFaint, fontSize: 14.5, padding: '24px 0', textAlign: 'center' }}>Nenhuma disputa em análise.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((d) => {
        const confirming = confirm?.id === d.id;
        return (
          <div key={d.id} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: color.inkFaint2 }}>Disputa</span>
              <a href={`/anuncio/${d.listingId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: color.primary, textDecoration: 'none' }}>ver anúncio ›</a>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: '#fbf0d8', color: color.ink }}>{COMP_LABEL[d.component] ?? d.component}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: color.inkFaint2 }}>{new Date(d.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{d.listingTitle}</div>
            <div style={{ fontSize: 13.5, color: color.ink, margin: '6px 0' }}>Motivo: <b>{REASON_LABEL[d.reason] ?? d.reason}</b></div>
            {d.description && <div style={{ fontSize: 13, color: color.inkMute, background: '#faf7f0', borderRadius: 10, padding: '8px 12px', marginBottom: 10, lineHeight: 1.5 }}>“{d.description}”</div>}
            <div style={{ fontSize: 12, color: color.inkFaint2, marginBottom: 12 }}>
              Correção pedida por <a href={`/perfil/${d.openedById}`} target="_blank" rel="noopener noreferrer" style={{ color: color.primary, textDecoration: 'none' }}>{d.openedBy}</a> · contraparte <a href={`/perfil/${d.counterpartyId}`} target="_blank" rel="noopener noreferrer" style={{ color: color.primary, textDecoration: 'none' }}>{d.counterparty}</a>
            </div>

            {confirming ? (
              <div style={{ background: '#f3f1e9', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12.5, color: color.ink, lineHeight: 1.4 }}>{confirm!.action === 'reverse' ? 'Reverter a venda? Ela deixa de contar, as avaliações ficam ocultas e a peça volta a ficar disponível (pausada).' : 'Manter a venda? Ela volta a contar como concluída e as avaliações reaparecem.'}</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Justificativa (opcional, registrada na disputa)" rows={2} style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineCard}`, borderRadius: 10, padding: 9, fontSize: 13.5, fontFamily: font.sans, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => resolve(d, confirm!.action)} disabled={!!busy} style={confirm!.action === 'reverse' ? btnDanger : btnPrimary}>Sim, confirmar</button>
                  <button onClick={() => { setConfirm(null); setNote(''); }} disabled={!!busy} style={btn}>Voltar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setNote(''); setConfirm({ id: d.id, action: 'reverse' }); }} disabled={!!busy} style={btnDanger}>Reverter venda</button>
                <button onClick={() => { setNote(''); setConfirm({ id: d.id, action: 'uphold' }); }} disabled={!!busy} style={btnPrimary}>Manter venda</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { ...btn, background: color.primary, color: '#fff', border: 'none' };
const btnDanger: React.CSSProperties = { ...btn, background: '#c0492f', color: '#fff', border: 'none' };
