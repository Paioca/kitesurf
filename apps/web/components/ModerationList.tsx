'use client';

// Lista de denúncias com ações de moderação (admin). PATCH muda o status.
import { useState } from 'react';
import { color, font } from '../lib/tokens';

type Report = { id: string; targetType: string; targetId: string; reason: string; status: string; createdAt: string; reporter: string };
const STATUS_LABEL: Record<string, string> = { open: 'Aberta', reviewed: 'Revisada', actioned: 'Resolvida' };
const STATUS_BG: Record<string, string> = { open: '#fbf0d8', reviewed: '#e8f1ec', actioned: '#eee' };

function targetHref(t: string, id: string): string | null {
  if (t === 'listing') return `/anuncio/${id}`;
  if (t === 'user') return `/perfil/${id}`;
  return null;
}

export function ModerationList({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [busy, setBusy] = useState('');

  async function setStatus(id: string, status: 'reviewed' | 'actioned' | 'open') {
    setBusy(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } finally { setBusy(''); }
  }

  if (!reports.length) return <div style={{ color: color.inkFaint, fontSize: 15, padding: '40px 0', textAlign: 'center' }}>Nenhuma denúncia.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reports.map((r) => {
        const href = targetHref(r.targetType, r.targetId);
        return (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: color.inkFaint2 }}>{r.targetType}</span>
              {href ? <a href={href} style={{ fontSize: 13, color: color.primary, textDecoration: 'none' }}>ver alvo ›</a> : <span style={{ fontSize: 12.5, color: color.inkFaint }}>{r.targetId.slice(0, 8)}…</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: STATUS_BG[r.status] ?? '#eee', color: color.ink }}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
            <div style={{ fontSize: 14.5, color: color.ink, marginBottom: 8 }}>{r.reason}</div>
            <div style={{ fontSize: 12, color: color.inkFaint2, marginBottom: 12 }}>por {r.reporter} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {r.status !== 'reviewed' && <button onClick={() => setStatus(r.id, 'reviewed')} disabled={!!busy} style={btn}>Marcar revisada</button>}
              {r.status !== 'actioned' && <button onClick={() => setStatus(r.id, 'actioned')} disabled={!!busy} style={btnPrimary}>Resolver</button>}
              {r.status !== 'open' && <button onClick={() => setStatus(r.id, 'open')} disabled={!!busy} style={btn}>Reabrir</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { ...btn, background: color.primary, color: '#fff', border: 'none' };
