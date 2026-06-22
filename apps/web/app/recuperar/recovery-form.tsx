'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Logo, TextInput } from '../../components/ui';
import { color, font } from '../../lib/tokens';

type Step = 'email' | 'sent' | 'phone' | 'otp' | 'done';

const DIALS = [
  ['Brasil', '+55'], ['Portugal', '+351'], ['Argentina', '+54'], ['Estados Unidos e Canadá', '+1'],
  ['Chile', '+56'], ['Uruguai', '+598'], ['Espanha', '+34'], ['França', '+33'], ['Alemanha', '+49'],
  ['Itália', '+39'], ['Países Baixos', '+31'], ['Reino Unido', '+44'], ['Suíça', '+41'], ['Austrália', '+61'],
] as const;

export function RecoveryForm({ token }: { token: string }) {
  const [step, setStep] = useState<Step>(token ? 'phone' : 'email');
  const [email, setEmail] = useState('');
  const [dial, setDial] = useState('+55');
  const [rawPhone, setRawPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const phone = rawPhone.trim().startsWith('+') ? `+${rawPhone.replace(/[^\d]/g, '')}` : `${dial}${rawPhone.replace(/[^\d]/g, '')}`;

  async function post(path: string, body: object) {
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Não foi possível continuar.');
      return data;
    } catch (e: any) { setError(e.message); return null; } finally { setLoading(false); }
  }

  async function requestEmail() {
    const data = await post('/api/auth/recovery/email/request', { email });
    if (data) { setMessage(data.message); setStep('sent'); }
  }

  async function requestSms() {
    const data = await post('/api/auth/recovery/phone/request', { token, phone });
    if (data) { if (data.devCode) setCode(String(data.devCode)); setMessage(data.message); setStep('otp'); }
  }

  async function confirmPhone() {
    const data = await post('/api/auth/recovery/phone/confirm', { token, phone, code });
    if (data) { setMessage(data.message); setStep('done'); }
  }

  return (
    <main style={shell}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo size={20} /></Link>
      <section style={card}>
        <div style={eyebrow}>Recuperação da conta</div>
        {step === 'email' && <>
          <h1 style={title}>Perdeu acesso ao telefone?</h1>
          <p style={copy}>Digite o e-mail de segurança já confirmado na sua conta.</p>
          <label style={label}>E-mail</label>
          <TextInput type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          <Button onClick={requestEmail} disabled={loading || !email.includes('@')} full style={{ marginTop: 18 }}>{loading ? 'Enviando…' : 'Enviar link de recuperação'}</Button>
        </>}
        {step === 'sent' && <>
          <h1 style={title}>Confira seu e-mail</h1>
          <p style={copy}>{message}</p>
          <Button href="/entrar" variant="outline" full>Voltar para entrar</Button>
        </>}
        {step === 'phone' && <>
          <h1 style={title}>Cadastre o novo telefone</h1>
          <p style={copy}>Enviaremos um código por SMS para confirmar que o novo número pertence a você.</p>
          <label style={label}>Novo telefone</label>
          <div style={{ display: 'flex', gap: 9 }}>
            <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Código do país" style={select}>
              {DIALS.map(([country, code]) => <option key={`${country}-${code}`} value={code}>{country} {code}</option>)}
            </select>
            <TextInput type="tel" inputMode="tel" autoComplete="tel" value={rawPhone} onChange={(e) => setRawPhone(e.target.value)} placeholder="(85) 99988-7766" style={{ flex: 1, minWidth: 0 }} />
          </div>
          <Button onClick={requestSms} disabled={loading || rawPhone.replace(/\D/g, '').length < 8} full style={{ marginTop: 18 }}>{loading ? 'Enviando…' : 'Enviar código por SMS'}</Button>
        </>}
        {step === 'otp' && <>
          <button onClick={() => setStep('phone')} style={back}>‹ Alterar telefone</button>
          <h1 style={title}>Confirme o novo telefone</h1>
          <p style={copy}>Digite o código de 6 números enviado para <strong>{phone}</strong>.</p>
          <TextInput inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center' }} />
          <Button onClick={confirmPhone} disabled={loading || code.length !== 6} full style={{ marginTop: 18 }}>{loading ? 'Confirmando…' : 'Atualizar telefone e entrar'}</Button>
          <button onClick={requestSms} disabled={loading} style={{ ...back, width: '100%', textAlign: 'center', marginTop: 14, marginBottom: 0 }}>Reenviar código</button>
        </>}
        {step === 'done' && <>
          <h1 style={title}>Conta recuperada</h1>
          <p style={copy}>{message}</p>
          <Button href="/conta" full>Ir para minha conta</Button>
        </>}
        {error && <div role="alert" style={errorBox}>{error}</div>}
      </section>
    </main>
  );
}

const shell: React.CSSProperties = { minHeight: '100vh', background: color.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 20, boxSizing: 'border-box' };
const card: React.CSSProperties = { width: '100%', maxWidth: 450, background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: 18, padding: 28, boxSizing: 'border-box' };
const eyebrow: React.CSSProperties = { color: color.primary, textTransform: 'uppercase', letterSpacing: '.35px', fontSize: 12, fontWeight: 800, marginBottom: 10 };
const title: React.CSSProperties = { fontFamily: font.serif, fontSize: 30, fontWeight: 600, margin: '0 0 10px', color: color.ink };
const copy: React.CSSProperties = { color: color.inkMute, fontSize: 14.5, lineHeight: 1.6, margin: '0 0 20px' };
const label: React.CSSProperties = { display: 'block', color: color.inkSoft, fontSize: 13, fontWeight: 700, marginBottom: 8 };
const select: React.CSSProperties = { width: 145, border: `1.5px solid ${color.lineInput}`, borderRadius: 11, background: color.surface, color: color.ink, padding: '0 8px', fontFamily: font.sans, fontSize: 13 };
const back: React.CSSProperties = { background: 'none', border: 0, padding: 0, marginBottom: 18, color: color.primary, fontFamily: font.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const errorBox: React.CSSProperties = { background: '#fdecea', color: '#b3261e', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5, marginTop: 16 };
