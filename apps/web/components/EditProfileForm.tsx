'use client';

// Editar perfil + excluir conta. Avatar via /api/uploads/avatar; salva via PATCH.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { color, font } from '../lib/tokens';
import { downscaleImage } from '../lib/resizeImage';
import { COUNTRY_NAMES } from '../lib/geo';
import { SPOT_LOCATIONS, STATE_OPTIONS } from '../lib/locations';
import { useConfirm } from './ConfirmDialog';

export function EditProfileForm({ initial }: { initial: { name: string; lastName: string; spot: string; country: string; email: string; emailVerified: boolean; avatarUrl: string; locale: string } }) {
  const [name, setName] = useState(initial.name);
  const [lastName, setLastName] = useState(initial.lastName);
  const [spot, setSpot] = useState(initial.spot);
  const [country, setCountry] = useState(initial.country || 'Brasil');
  const [email, setEmail] = useState(initial.email);
  const [savedEmail, setSavedEmail] = useState(initial.email);
  const [emailVerified, setEmailVerified] = useState(initial.emailVerified);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [locale, setLocale] = useState(initial.locale || 'pt');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirm();

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const small = await downscaleImage(file, 512);
      const fd = new FormData(); fd.append('file', small);
      const res = await fetch('/api/uploads/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Falha no upload.');
      setAvatarUrl(data.url);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true); setError(''); setEmailMessage('');
    try {
      const res = await fetch('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, lastName: lastName.trim() || null, spot: spot || null, country, email: email.trim() || null, avatarUrl, locale }) });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.message ?? 'Erro ao salvar.');

      setSavedEmail(saved.email ?? '');
      setEmailVerified(!!saved.emailVerified);

      // E-mail novo ou ainda não confirmado: salvar e enviar a confirmação no
      // mesmo fluxo. Usuários antigos não precisam descobrir um segundo passo.
      if (saved.email && !saved.emailVerified) {
        const verifyRes = await fetch('/api/auth/email/verification/request', { method: 'POST' });
        const verification = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok) throw new Error(`Perfil salvo, mas ${verification.message?.toLowerCase() ?? 'não foi possível enviar a confirmação.'}`);
        setEmailMessage(verification.message ?? 'Perfil salvo. Enviamos a confirmação para seu e-mail.');
        setSaving(false);
        return;
      }
      window.location.href = '/conta';
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  async function remove() {
    const ok = await confirm({ title: 'Excluir sua conta?', body: 'Seus anúncios saem do ar e não dá pra desfazer.', confirmLabel: 'Excluir conta', danger: true });
    if (!ok) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      window.location.href = '/';
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  async function sendEmailVerification() {
    setSendingEmail(true); setError(''); setEmailMessage('');
    try {
      const res = await fetch('/api/auth/email/verification/request', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Erro ao enviar confirmação.');
      setEmailMessage(data.message);
    } catch (e: any) { setError(e.message); } finally { setSendingEmail(false); }
  }

  const canSave = name.trim().length >= 2 && !!avatarUrl && !saving && !uploading;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, margin: '0 0 20px', color: color.primary }}>Editar perfil</h1>
      {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />

      <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 999, flex: 'none', cursor: 'pointer', border: avatarUrl ? 'none' : `1.5px dashed #bcccc4`, background: avatarUrl ? `center/cover url("${avatarUrl}")` : '#fbfaf6', color: '#a8b1aa', fontSize: 24 }}>
          {!avatarUrl && (uploading ? '…' : '+')}
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: color.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{uploading ? 'Enviando…' : 'Trocar foto'}</button>
      </div>

      {/* Form em card (refresh): Nome/Sobrenome 2-col + demais campos. */}
      <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: '20px 18px 18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Nome"><input className="kl-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Sobrenome"><input className="kl-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Seu sobrenome" /></Field>
      </div>
      <Field label="Spot de interesse">
        <select className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)}>
          <option value="">Selecione um spot</option>
          {STATE_OPTIONS.map((state) => (
            <optgroup key={state.value} label={state.label}>
              {SPOT_LOCATIONS.filter((s) => s.uf === state.value).map((s) => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Nacionalidade">
        <select className="kl-input" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="E-mail de segurança (opcional)">
        <input className="kl-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailMessage(''); }} placeholder="voce@email.com" />
        {email && email.trim().toLowerCase() === savedEmail.trim().toLowerCase() ? (
          emailVerified ? (
            <div style={{ fontSize: 12.5, color: color.primary, fontWeight: 700, marginTop: 8 }}>E-mail confirmado para recuperação da conta.</div>
          ) : (
            <button type="button" onClick={sendEmailVerification} disabled={sendingEmail} style={{ background: 'none', border: 'none', color: color.primary, fontSize: 13, fontWeight: 700, padding: '9px 0 0', cursor: sendingEmail ? 'wait' : 'pointer' }}>
              {sendingEmail ? 'Enviando…' : 'Confirmar este e-mail'}
            </button>
          )
        ) : email ? (
          <div style={{ fontSize: 12.5, color: color.inkFaint, marginTop: 8 }}>Salve o novo e-mail antes de confirmá-lo.</div>
        ) : null}
        {emailMessage && <div style={{ fontSize: 12.5, color: color.primary, marginTop: 8 }}>{emailMessage}</div>}
      </Field>
      <Field label="Idioma">
        <div style={{ display: 'inline-flex', background: '#fff', border: `1.5px solid ${color.lineCard}`, borderRadius: 999, padding: 3 }}>
          {(['pt', 'en'] as const).map((lo) => (
            <button key={lo} onClick={() => setLocale(lo)} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, background: locale === lo ? color.primary : 'transparent', color: locale === lo ? '#fff' : color.inkMute }}>{lo === 'pt' ? 'Português' : 'English'}</button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <Link href="/conta" style={{ ...btn, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink }}>Cancelar</Link>
        <button onClick={save} disabled={!canSave} style={{ ...btn, flex: 1, background: canSave ? color.primary : '#dfe3df', color: canSave ? '#fff' : color.inkFaint2, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </div>
      </div>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${color.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b3261e', marginBottom: 6 }}>Zona de risco</div>
        <p style={{ fontSize: 13, color: color.inkFaint2, margin: '0 0 12px' }}>Excluir a conta tira seus anúncios do ar e remove ou substitui seus dados pessoais. O histórico necessário para preservar negócios e avaliações pode ser mantido associado a uma conta removida. Não dá pra desfazer.</p>
        <button onClick={remove} disabled={saving} style={{ background: '#fff', border: '1.5px solid #f0d4d0', color: '#b3261e', fontSize: 14, fontWeight: 700, padding: '12px 18px', borderRadius: 11, cursor: 'pointer' }}>Excluir minha conta</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, display: 'block', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 12, textDecoration: 'none' };
