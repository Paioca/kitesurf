'use client';

// Vendedor, antes do aceite (§8): dois botões — Recusar · Conversar no WhatsApp.
// "Conversar no WhatsApp" abre uma confirmação inline (o WhatsApp do vendedor também
// será compartilhado); ao confirmar, aceita o pedido e abre o WhatsApp do comprador
// NA MESMA ABA. window.open() depois de um await é bloqueado no Safari (perde o
// user-gesture) — por isso navegamos com window.location.assign no mesmo gesto, e a
// API devolve o link já na resposta do aceite.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { color } from '../lib/tokens';
import { useToast } from './Toast';

const WA = '#25D366'; // verde WhatsApp (mesma linguagem dos botões de contato)

export function RequestActions({ id }: { id: string; type?: string }) {
  const [busy, setBusy] = useState<'' | 'accepted' | 'declined'>('');
  const [confirming, setConfirming] = useState(false); // confirmação inline do compartilhamento
  const [err, setErr] = useState('');
  const router = useRouter();
  const toast = useToast();
  const anyBusy = busy !== '';

  async function decline() {
    if (!window.confirm('Recusar este pedido?')) return;
    setBusy('declined'); setErr('');
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'declined' }) });
      if (res.ok) { toast.show('Pedido recusado.'); router.refresh(); setBusy(''); }
      else { const m = (await res.json().catch(() => ({}))).message ?? 'Não deu pra salvar. Tenta de novo.'; setErr(m); toast.show(m, 'err'); setBusy(''); }
    } catch { setErr('Sem conexão. Tenta de novo.'); toast.show('Sem conexão.', 'err'); setBusy(''); }
  }

  async function accept() {
    setBusy('accepted'); setErr('');
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'accepted' }) });
      const data = await res.json().catch(() => ({} as { whatsapp?: string; message?: string }));
      if (res.ok) {
        // mesma aba, mesmo gesto: navega pro WhatsApp do comprador (não destrava o
        // busy — a página sai daqui). Sem link (comprador sem telefone) cai no refresh.
        if (data.whatsapp) { window.location.assign(data.whatsapp); return; }
        toast.show('WhatsApp liberado pro comprador.'); router.refresh(); setBusy('');
      } else {
        const m = data.message ?? 'Não deu pra salvar. Tenta de novo.';
        setErr(m); toast.show(m, 'err'); setBusy(''); setConfirming(false);
      }
    } catch { setErr('Sem conexão. Tenta de novo.'); toast.show('Sem conexão.', 'err'); setBusy(''); setConfirming(false); }
  }

  if (confirming) {
    return (
      <div style={{ marginTop: 12, background: '#f0f6f2', border: `1px solid ${color.lineCard}`, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13.5, color: color.ink, lineHeight: 1.4, marginBottom: 12 }}>Ao continuar, seu WhatsApp também será compartilhado com o comprador.</div>
        <div style={{ display: 'flex', gap: 11 }}>
          <button onClick={() => { setConfirming(false); setErr(''); }} disabled={anyBusy} style={{ flex: 'none', background: '#fff', color: color.inkMute, border: `1.5px solid ${color.lineInput}`, borderRadius: 11, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy ? 0.5 : 1 }}>Voltar</button>
          <button onClick={accept} disabled={anyBusy} style={{ flex: 1, background: WA, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy ? 0.6 : 1 }}>{busy === 'accepted' ? 'Compartilhando…' : 'Compartilhar e conversar'}</button>
        </div>
        {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 8 }}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 11 }}>
        <button onClick={decline} disabled={anyBusy} style={{ flex: 'none', background: '#fff', color: color.inkMute, border: `1.5px solid ${color.lineInput}`, borderRadius: 11, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy && busy !== 'declined' ? 0.5 : 1 }}>{busy === 'declined' ? 'Recusando…' : 'Recusar'}</button>
        <button onClick={() => { setErr(''); setConfirming(true); }} disabled={anyBusy} style={{ flex: 1, background: WA, color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontSize: 14.5, fontWeight: 700, cursor: anyBusy ? 'default' : 'pointer', opacity: anyBusy ? 0.6 : 1 }}>Conversar no WhatsApp</button>
      </div>
      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
