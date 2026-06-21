'use client';

import { useState } from 'react';
import { Button, Logo } from '../../components/ui';
import { color, font } from '../../lib/tokens';

export function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [message, setMessage] = useState(token ? '' : 'Este link não tem um token válido.');

  async function confirm() {
    setStatus('loading'); setMessage('');
    const res = await fetch('/api/auth/email/verification/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus('idle'); setMessage(data.message ?? 'Não foi possível confirmar o e-mail.'); return; }
    setStatus('done'); setMessage(data.message ?? 'E-mail confirmado.');
  }

  return (
    <main style={shell}>
      <a href="/" style={{ textDecoration: 'none' }}><Logo size={20} /></a>
      <section style={card}>
        <div style={eyebrow}>Segurança da conta</div>
        <h1 style={title}>{status === 'done' ? 'E-mail confirmado' : 'Confirme seu e-mail'}</h1>
        <p style={copy}>{status === 'done' ? 'Agora você pode usar este e-mail para recuperar sua conta se perder acesso ao telefone.' : 'Confirme que este e-mail pertence a você. O link é usado uma única vez.'}</p>
        {message && <div style={{ ...feedback, color: status === 'done' ? color.primary : '#b3261e' }}>{message}</div>}
        {status === 'done' ? <Button href="/conta" full>Ir para minha conta</Button> : <Button onClick={confirm} disabled={!token || status === 'loading'} full>{status === 'loading' ? 'Confirmando…' : 'Confirmar e-mail'}</Button>}
      </section>
    </main>
  );
}

const shell: React.CSSProperties = { minHeight: '100vh', background: color.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 20, boxSizing: 'border-box' };
const card: React.CSSProperties = { width: '100%', maxWidth: 430, background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: 18, padding: 28, boxSizing: 'border-box' };
const eyebrow: React.CSSProperties = { color: color.primary, textTransform: 'uppercase', letterSpacing: '.35px', fontSize: 12, fontWeight: 800, marginBottom: 10 };
const title: React.CSSProperties = { fontFamily: font.serif, fontSize: 30, fontWeight: 600, margin: '0 0 10px', color: color.ink };
const copy: React.CSSProperties = { color: color.inkMute, fontSize: 14.5, lineHeight: 1.6, margin: '0 0 20px' };
const feedback: React.CSSProperties = { background: color.bg, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5, marginBottom: 16 };
