'use client';

// Cadastro / Entrar — design Kite Life (handoff Entrar.dc.html).
// Fluxo: telefone -> OTP -> perfil (foto obrigatória) -> pronto. Sessão em cookie.
import { useEffect, useRef, useState } from 'react';
import { downscaleImage } from '../../lib/resizeImage';
import { Logo } from '../../components/ui';

type Step = 'phone' | 'otp' | 'profile' | 'done';

const PERKS = [
  'Telefone verificado — 1 número, 1 conta',
  'Reputação real, atrelada a vendas confirmadas',
  'Fotos guiadas e anúncios padronizados',
];

export default function Entrar() {
  const [step, setStep] = useState<Step>('phone');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [rawPhone, setRawPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef('');

  // Auto-submete o OTP quando as 6 células completam (no mock o devCode já preenche).
  // Cada código único é submetido uma vez só (evita loop em código errado).
  useEffect(() => {
    if (step === 'otp' && code.length === 6 && !loading && submittedRef.current !== code) {
      submittedRef.current = code;
      verify(false);
    }
  }, [step, code, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monta E.164: se começar com +, usa direto; senão assume +55.
  const phone = rawPhone.trim().startsWith('+')
    ? '+' + rawPhone.replace(/[^\d]/g, '')
    : '+55' + rawPhone.replace(/[^\d]/g, '');

  async function requestOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Falha ao enviar código.');
      // No modo mock o código volta aqui e preenche silenciosamente (sem afordância visível).
      if (data.devCode) setCode(String(data.devCode));
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(withProfile = false) {
    setError('');
    setLoading(true);
    try {
      const body: any = { phone, code };
      if (withProfile) Object.assign(body, { name, email: email.trim() || undefined, avatarUrl, instagramHandle: instagram.trim() || undefined, locale: lang });
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.needsOnboarding) {
        setStep('profile');
        return;
      }
      if (!res.ok) throw new Error(data.message ?? 'Código inválido.');
      // Volta pro ponto de origem (ex.: o anúncio que o usuário ia contatar).
      const next = new URLSearchParams(window.location.search).get('next');
      if (next && next.startsWith('/')) { window.location.href = next; return; }
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const small = await downscaleImage(file, 512); // foto de perfil — 512px basta
      const fd = new FormData();
      fd.append('file', small);
      const res = await fetch('/api/uploads/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Falha no upload.');
      setAvatarUrl(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // Foto obrigatória (anti-fake) + nome. E-mail é opcional — pedido depois, dentro da plataforma.
  const canFinish = !!avatarUrl && name.trim().length >= 2;

  return (
    <div style={shell}>
      {/* LEFT imagery (desktop) */}
      <div className="only-desktop" style={imagery}>
        <div style={imageryOverlay} />
        <div style={imageryInner}>
          <a href="/" style={{ textDecoration: 'none' }}><Logo onDark size={22} /></a>
          <div>
            <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 19, color: '#e7c79a', marginBottom: 14 }}>Entre na comunidade</div>
            <h2 style={{ fontFamily: "'Spectral',serif", fontSize: 38, fontWeight: 600, color: '#fff', lineHeight: 1.1, margin: '0 0 22px', maxWidth: 420 }}>
              Um número, uma conta. É assim que a confiança começa.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxWidth: 380 }}>
              {PERKS.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(231,199,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span style={{ width: 9, height: 9, background: '#e7c79a', transform: 'rotate(45deg)', borderRadius: 2 }} />
                  </span>
                  <span style={{ fontSize: 14.5, color: '#dce8e1' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT form */}
      <div style={formWrap}>
        <div style={{ width: '100%', maxWidth: 390 }}>
          {error && <div style={errorBox}>{error}</div>}

          {step === 'phone' && (
            <>
              <h1 style={h1}>Entrar ou criar conta</h1>
              <p style={sub}>Sem senha. Te mandamos um código pra confirmar.</p>
              <div style={tabs}>
                <button onClick={() => setMethod('phone')} style={method === 'phone' ? tabOn : tabOff}>Telefone</button>
                <button onClick={() => setMethod('email')} style={method === 'email' ? tabOn : tabOff}>E-mail</button>
              </div>
              {method === 'phone' ? (
                <>
                  <label style={lbl}>Telefone</label>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={ddi}>🇧🇷 +55</div>
                    <input value={rawPhone} onChange={(e) => setRawPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(85) 99988-7766" style={{ ...input, flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#8a948d', marginBottom: 24 }}>
                    🌎 Aceita número internacional — gringo também entra.
                  </div>
                  <button onClick={requestOtp} disabled={loading || rawPhone.replace(/\D/g, '').length < 8} style={primaryBtn}>
                    {loading ? '...' : 'Enviar código'}
                  </button>
                  <p style={terms}>Ao continuar, você concorda com os Termos e a Política de Privacidade da Vaya.</p>
                </>
              ) : (
                <div style={{ padding: '20px 0', fontSize: 14, color: '#6b7a73' }}>
                  Login por e-mail chega em breve. Por enquanto, use o <button onClick={() => setMethod('phone')} style={linkInline}>telefone</button>.
                </div>
              )}
            </>
          )}

          {step === 'otp' && (
            <>
              <button onClick={() => setStep('phone')} style={backBtn}>‹ Voltar</button>
              <h1 style={h1}>Digite o código</h1>
              <p style={sub}>Enviamos para <strong style={{ color: '#23332e' }}>{phone}</strong>.</p>
              <OtpCells value={code} onChange={setCode} />
              <div style={{ fontSize: 13, color: '#8a948d', margin: '6px 0 26px' }}>
                Não recebeu? <button onClick={requestOtp} style={linkInline}>Reenviar</button>
              </div>
              <button onClick={() => verify(false)} disabled={loading || code.length < 4} style={primaryBtn}>
                {loading ? '...' : 'Verificar'}
              </button>
            </>
          )}

          {step === 'profile' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#1f6b5c', marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#1f6b5c' }} />Telefone verificado
              </div>
              <h1 style={h1}>Complete seu perfil</h1>
              <p style={sub}>É o que dá cara de gente de verdade pro seu perfil.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
                <button onClick={() => fileRef.current?.click()} style={{ ...avatarBtn, ...(avatarUrl ? { border: 'none', backgroundImage: `url("${avatarUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
                  {!avatarUrl && <span style={{ fontSize: 26, color: '#a8b1aa', lineHeight: 1 }}>{uploading ? '…' : '+'}</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>Foto de perfil <span style={{ color: '#c0492f' }}>*</span></div>
                  <div style={{ fontSize: 12.5, color: '#8a948d', lineHeight: 1.4, maxWidth: 200 }}>
                    {avatarUrl ? 'Foto adicionada. Toque para trocar.' : 'Obrigatória. Toque para adicionar uma foto sua.'}
                  </div>
                </div>
              </div>

              <label style={lbl}>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Seu nome" style={{ ...input, width: '100%', marginBottom: 16 }} />

              <label style={lbl}>E-mail <span style={{ color: '#9aa49d', fontWeight: 500 }}>· opcional</span></label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" style={{ ...input, width: '100%', marginBottom: 16 }} />

              <label style={lbl}>Instagram <span style={{ color: '#9aa49d', fontWeight: 500 }}>· opcional</span></label>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuperfil" style={{ ...input, width: '100%', marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: '#9aa49d', marginBottom: 18 }}>A comunidade vive no IG — exibir o @ é prova social potente.</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#48564f' }}>Idioma</span>
                <div style={{ display: 'flex', border: '1px solid #d3ccbd', borderRadius: 999, overflow: 'hidden', fontSize: 12.5, fontWeight: 600 }}>
                  <button onClick={() => setLang('pt')} style={lang === 'pt' ? segOn : segOff}>Português</button>
                  <button onClick={() => setLang('en')} style={lang === 'en' ? segOn : segOff}>English</button>
                </div>
              </div>

              <button onClick={() => verify(true)} disabled={!canFinish || loading} style={canFinish ? primaryBtn : disabledBtn}>
                {loading ? '...' : canFinish ? 'Criar conta' : 'Adicione foto e nome'}
              </button>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={doneAvatar(avatarUrl)}>{!avatarUrl && 'VC'}</div>
              <h1 style={{ fontFamily: "'Spectral',serif", fontSize: 30, fontWeight: 600, margin: '0 0 10px' }}>Bem-vindo à Vaya!</h1>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7a73', margin: '0 0 28px' }}>Sua conta está pronta e verificada. Bons ventos. 🪁</p>
              <a href="/" style={{ ...primaryBtn, display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: 11 }}>Explorar equipamento</a>
              <a href="/anunciar" style={{ color: '#6b7a73', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Anunciar meu primeiro item</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OtpCells({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cells = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  function handle(i: number, v: string) {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = digit;
    onChange(arr.join('').slice(0, 6));
    if (digit && i < 5) {
      const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement | null;
      next?.focus();
    }
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
      {cells.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          onChange={(e) => handle(i, e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (t) { e.preventDefault(); onChange(t); }
          }}
          style={{ flex: 1, height: 58, borderRadius: 12, textAlign: 'center', fontSize: 23, fontWeight: 700, background: '#fff', border: d ? '2px solid #1f6b5c' : '1.5px solid #e0d9c9' }}
        />
      ))}
    </div>
  );
}

/* styles */
const shell: React.CSSProperties = { minHeight: '100vh', display: 'flex', background: '#f6f3ec' };
const imagery: React.CSSProperties = { position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#0c2520,#1f6b5c)', flex: 1.05 };
const imageryOverlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(12,37,32,0.78) 0%,rgba(12,37,32,0.45) 55%,rgba(12,37,32,0.62) 100%)' };
const imageryInner: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 44, minHeight: '100vh', boxSizing: 'border-box' };
const formWrap: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: '100vh', boxSizing: 'border-box' };
const h1: React.CSSProperties = { fontFamily: "'Spectral',serif", fontSize: 31, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 8px' };
const sub: React.CSSProperties = { fontSize: 15, color: '#6b7a73', margin: '0 0 26px' };
const tabs: React.CSSProperties = { display: 'flex', background: '#efe9dc', borderRadius: 12, padding: 4, marginBottom: 22 };
const tabOn: React.CSSProperties = { flex: 1, background: '#fff', color: '#23332e', border: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontSize: 14, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const tabOff: React.CSSProperties = { flex: 1, background: 'none', color: '#8a948d', border: 'none', borderRadius: 9, padding: 11, cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontSize: 14, fontWeight: 600 };
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#48564f', display: 'block', marginBottom: 8 };
const input: React.CSSProperties = { fontSize: 15, fontWeight: 500, border: '1.5px solid #e0d9c9', borderRadius: 11, padding: '13px 15px', background: '#fff' };
const ddi: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, border: '1.5px solid #e0d9c9', borderRadius: 11, padding: '0 14px', background: '#fff', fontSize: 15, fontWeight: 600, flex: 'none' };
const primaryBtn: React.CSSProperties = { width: '100%', background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 12, padding: 16, fontFamily: "'Archivo',sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer' };
const disabledBtn: React.CSSProperties = { ...primaryBtn, background: '#dfe3df', color: '#9aa49d', cursor: 'not-allowed' };
const terms: React.CSSProperties = { fontSize: 12, lineHeight: 1.5, color: '#9aa49d', textAlign: 'center', margin: '18px 0 0' };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 13.5, color: '#6b7a73', cursor: 'pointer', padding: 0, marginBottom: 20, fontFamily: "'Archivo',sans-serif" };
const linkInline: React.CSSProperties = { background: 'none', border: 'none', color: '#1f6b5c', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: "'Archivo',sans-serif" };
const errorBox: React.CSSProperties = { background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 };
const avatarBtn: React.CSSProperties = { width: 74, height: 74, borderRadius: 999, flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '2px dashed #cbc3b2' };
const segOn: React.CSSProperties = { background: '#1f6b5c', color: '#fff', border: 'none', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontSize: 12.5, fontWeight: 700 };
const segOff: React.CSSProperties = { background: 'transparent', color: '#6b7a73', border: 'none', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontSize: 12.5, fontWeight: 600 };

function doneAvatar(url: string): React.CSSProperties {
  return { width: 72, height: 72, borderRadius: 999, background: url ? `center/cover url("${url}")` : '#1f6b5c', color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
}
