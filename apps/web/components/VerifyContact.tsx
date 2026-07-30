'use client';

// Painel de verificação pendente — aparece quando o backend devolve
// 403 { code: 'verification_required', missing: ['phone'|'email'] } nas ações de
// negociação (criar anúncio, oferta/visita). Resolve inline, sem sair da página:
//   phone → adiciona o número e confirma o OTP (rotas /api/auth/phone/verification/*)
//   email → dispara o link de confirmação (rota /api/auth/email/verification/request)
import { useState } from 'react';
import { color, font } from '../lib/tokens';

export type MissingVerification = Array<'phone' | 'email'>;

const btn: React.CSSProperties = { display: 'block', width: '100%', background: color.primary, color: '#fff', border: 'none', textAlign: 'center', padding: 14, borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: font.sans };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${color.lineInput}`, borderRadius: 11, padding: '13px 15px', fontSize: 15, fontWeight: 600, fontFamily: font.sans, marginBottom: 10 };

export function VerifyContact({ missing, onDone }: { missing: MissingVerification; onDone: () => void }) {
  const needPhone = missing.includes('phone');
  const needEmail = missing.includes('email');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneOk, setPhoneOk] = useState(!needPhone);
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message ?? 'Erro.');
    return data;
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr('');
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const e164 = phone.trim().startsWith('+') ? '+' + phone.replace(/[^\d]/g, '') : '+55' + phone.replace(/[^\d]/g, '');

  return (
    <div style={{ border: `1.5px solid ${color.lineCard}`, borderRadius: 13, padding: 16, background: '#fff', marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: color.ink, marginBottom: 6 }}>Falta um passo para continuar</div>
      <div style={{ fontSize: 13, color: color.inkMute, lineHeight: 1.5, marginBottom: 14 }}>
        Para anunciar ou negociar, confirme {needPhone && needEmail ? 'seu telefone e seu e-mail' : needPhone ? 'seu telefone' : 'seu e-mail'}. Isso protege a comunidade contra perfis falsos.
      </div>

      {needPhone && !phoneOk && (
        <div style={{ marginBottom: needEmail ? 16 : 0 }}>
          {!otpSent ? (
            <>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="(85) 99988-7766" style={input} />
              <button disabled={busy || phone.replace(/\D/g, '').length < 8} onClick={() => run(async () => { const d = await post('/api/auth/phone/verification/request', { phone: e164 }); setOtpSent(true); if (d.devCode) setCode(String(d.devCode)); })} style={btn}>
                {busy ? 'Enviando…' : 'Receber código por SMS'}
              </button>
            </>
          ) : (
            <>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código de 6 dígitos" style={input} />
              <button disabled={busy || code.length !== 6} onClick={() => run(async () => { await post('/api/auth/phone/verification/confirm', { phone: e164, code }); setPhoneOk(true); if (!needEmail) onDone(); })} style={btn}>
                {busy ? 'Verificando…' : 'Confirmar telefone'}
              </button>
            </>
          )}
        </div>
      )}
      {needPhone && phoneOk && <div style={{ fontSize: 13, color: color.primary, fontWeight: 700, marginBottom: needEmail ? 14 : 0 }}>✓ Telefone verificado</div>}

      {needEmail && (
        !emailSent ? (
          <button disabled={busy} onClick={() => run(async () => { await post('/api/auth/email/verification/request'); setEmailSent(true); })} style={btn}>
            {busy ? 'Enviando…' : 'Enviar link de confirmação por e-mail'}
          </button>
        ) : (
          <div style={{ fontSize: 13, color: color.inkMute, lineHeight: 1.5 }}>
            Link enviado. Confirme na sua caixa de entrada e volte aqui — depois é só tentar de novo.
            {' '}Sem e-mail na conta? Adicione em <a href="/conta" style={{ color: color.primary, fontWeight: 700 }}>seu perfil</a>.
          </div>
        )
      )}

      {err && <div style={{ color: '#b3261e', fontSize: 13, marginTop: 10 }}>{err}</div>}
    </div>
  );
}
