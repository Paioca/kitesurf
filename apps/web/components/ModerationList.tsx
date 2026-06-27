'use client';

// Lista de denúncias com AÇÕES REAIS de moderação (admin): suspender/restaurar
// usuário, remover/restaurar anúncio — com trilha de auditoria. O status (revisada/
// reaberta) é só triagem; quem resolve de verdade é a ação.
import { useState } from 'react';
import { color } from '../lib/tokens';
import { useToast } from './Toast';

type Act = { action: string; by: string; at: string; note: string | null };
type TargetState = 'user_active' | 'user_blocked' | 'listing_active' | 'listing_removed' | null;
type Report = { id: string; targetType: string; targetId: string; reason: string; status: string; createdAt: string; reporter: string; targetState: TargetState; actions: Act[] };

const STATUS_LABEL: Record<string, string> = { open: 'Aberta', reviewed: 'Revisada', actioned: 'Resolvida' };
const STATUS_BG: Record<string, string> = { open: '#fbf0d8', reviewed: '#e8f1ec', actioned: '#eee' };
const ACTION_LABEL: Record<string, string> = { suspend_user: 'Suspendeu usuário', restore_user: 'Restaurou usuário', remove_listing: 'Removeu anúncio', restore_listing: 'Restaurou anúncio' };
const STATE_LABEL: Record<string, { txt: string; bg: string; fg: string }> = {
  user_blocked: { txt: 'Usuário suspenso', bg: '#fbeae4', fg: '#9a5040' },
  listing_removed: { txt: 'Anúncio removido', bg: '#fbeae4', fg: '#9a5040' },
};

function targetHref(t: string, id: string): string | null {
  if (t === 'listing') return `/anuncio/${id}`;
  if (t === 'user') return `/perfil/${id}`;
  return null;
}

// ação primária disponível conforme o tipo + estado atual do alvo
function primaryAction(r: Report): { action: string; label: string; danger: boolean } | null {
  switch (r.targetState) {
    case 'user_active': return { action: 'suspend_user', label: 'Suspender usuário', danger: true };
    case 'user_blocked': return { action: 'restore_user', label: 'Restaurar usuário', danger: false };
    case 'listing_active': return { action: 'remove_listing', label: 'Remover anúncio', danger: true };
    case 'listing_removed': return { action: 'restore_listing', label: 'Restaurar anúncio', danger: false };
    default: return null;
  }
}

export function ModerationList({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: string } | null>(null);
  const toast = useToast();

  async function setStatus(id: string, status: 'reviewed' | 'open') {
    setBusy(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      else toast.show('Erro ao atualizar.', 'err');
    } finally { setBusy(''); }
  }

  async function runAction(r: Report, action: string) {
    setBusy(r.id); setConfirm(null);
    try {
      const res = await fetch('/api/moderation/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: r.id, action, targetId: r.targetId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.show(data.message ?? 'Erro.', 'err'); return; }
      toast.show('Ação aplicada.');
      // reflete o novo estado localmente (sem recarregar)
      const newState: TargetState = action === 'suspend_user' ? 'user_blocked' : action === 'restore_user' ? 'user_active' : action === 'remove_listing' ? 'listing_removed' : 'listing_active';
      const me: Act = { action, by: 'você', at: new Date().toISOString(), note: null };
      setReports((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: 'actioned', targetState: newState, actions: [me, ...x.actions] } : x)));
    } catch { toast.show('Sem conexão.', 'err'); } finally { setBusy(''); }
  }

  if (!reports.length) return <div style={{ color: color.inkFaint, fontSize: 15, padding: '40px 0', textAlign: 'center' }}>Nenhuma denúncia.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reports.map((r) => {
        const href = targetHref(r.targetType, r.targetId);
        const pa = primaryAction(r);
        const state = r.targetState ? STATE_LABEL[r.targetState] : null;
        const confirming = confirm?.id === r.id;
        return (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: color.inkFaint2 }}>{r.targetType}</span>
              {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: color.primary, textDecoration: 'none' }}>ver alvo ›</a> : <span style={{ fontSize: 12.5, color: color.inkFaint }}>{r.targetId.slice(0, 8)}…</span>}
              {state && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: state.bg, color: state.fg }}>{state.txt}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: STATUS_BG[r.status] ?? '#eee', color: color.ink }}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
            <div style={{ fontSize: 14.5, color: color.ink, marginBottom: 8 }}>{r.reason}</div>
            <div style={{ fontSize: 12, color: color.inkFaint2, marginBottom: 12 }}>por {r.reporter} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>

            {r.actions.length > 0 && (
              <div style={{ background: '#faf7f0', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
                {r.actions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: color.inkMute, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: color.ink }}>{ACTION_LABEL[a.action] ?? a.action}</span> · {a.by} · {new Date(a.at).toLocaleDateString('pt-BR')}{a.note ? `. ${a.note}` : ''}
                  </div>
                ))}
              </div>
            )}

            {confirming ? (
              <div style={{ background: '#f3f1e9', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12.5, color: color.ink }}>{confirm?.action === 'suspend_user' ? 'Suspender este usuário? As sessões ativas dele caem na hora.' : 'Remover este anúncio? Os pedidos abertos são encerrados.'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => runAction(r, confirm!.action)} disabled={!!busy} style={btnDanger}>Sim, confirmar</button>
                  <button onClick={() => setConfirm(null)} disabled={!!busy} style={btn}>Voltar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pa && <button onClick={() => (pa.danger ? setConfirm({ id: r.id, action: pa.action }) : runAction(r, pa.action))} disabled={!!busy} style={pa.danger ? btnDanger : btnPrimary}>{pa.label}</button>}
                {r.status !== 'reviewed' && <button onClick={() => setStatus(r.id, 'reviewed')} disabled={!!busy} style={btn}>Marcar revisada</button>}
                {r.status !== 'open' && <button onClick={() => setStatus(r.id, 'open')} disabled={!!busy} style={btn}>Reabrir</button>}
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
