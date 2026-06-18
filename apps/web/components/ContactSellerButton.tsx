'use client';

// CTA do detalhe: abre/cria a conversa com o vendedor e leva pro chat.
import { useState } from 'react';
import { color } from '../lib/tokens';

export function ContactSellerButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function go() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) });
      if (res.status === 401) {
        window.location.href = '/entrar';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro.');
      window.location.href = `/chat?c=${data.id}`;
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 26 }}>
      <button onClick={go} disabled={loading} style={{ display: 'block', width: '100%', background: color.primary, color: '#fff', border: 'none', textAlign: 'center', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: "'Archivo',sans-serif" }}>
        {loading ? '...' : 'Conversar com o vendedor'}
      </button>
      {err && <p style={{ fontSize: 13, color: '#b3261e', margin: '8px 0 0' }}>{err}</p>}
    </div>
  );
}
