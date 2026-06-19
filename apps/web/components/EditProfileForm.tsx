'use client';

// Editar perfil + excluir conta. Avatar via /api/uploads/avatar; salva via PATCH.
import { useRef, useState } from 'react';
import { color, font } from '../lib/tokens';
import { downscaleImage } from '../lib/resizeImage';

export function EditProfileForm({ initial }: { initial: { name: string; instagramHandle: string; avatarUrl: string; locale: string } }) {
  const [name, setName] = useState(initial.name);
  const [instagram, setInstagram] = useState(initial.instagramHandle);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [locale, setLocale] = useState(initial.locale || 'pt');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, instagramHandle: instagram || null, avatarUrl, locale }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro ao salvar.');
      window.location.href = '/conta';
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  async function remove() {
    if (!window.confirm('Excluir sua conta? Seus anúncios saem do ar e não dá pra desfazer.')) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro.');
      window.location.href = '/';
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  const canSave = name.trim().length >= 2 && !!avatarUrl && !saving && !uploading;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 20px' }}>Editar perfil</h1>
      {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <button onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 999, flex: 'none', cursor: 'pointer', border: avatarUrl ? 'none' : `1.5px dashed #bcccc4`, background: avatarUrl ? `center/cover url("${avatarUrl}")` : '#fbfaf6', color: '#a8b1aa', fontSize: 24 }}>
          {!avatarUrl && (uploading ? '…' : '+')}
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: color.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{uploading ? 'Enviando…' : 'Trocar foto'}</button>
      </div>

      <Field label="Nome"><input className="kl-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Instagram (opcional)"><input className="kl-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuperfil" /></Field>
      <Field label="Idioma">
        <div style={{ display: 'inline-flex', background: '#fff', border: `1.5px solid ${color.lineCard}`, borderRadius: 999, padding: 3 }}>
          {(['pt', 'en'] as const).map((lo) => (
            <button key={lo} onClick={() => setLocale(lo)} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, background: locale === lo ? color.primary : 'transparent', color: locale === lo ? '#fff' : color.inkMute }}>{lo === 'pt' ? 'Português' : 'English'}</button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <a href="/conta" style={{ ...btn, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink }}>Cancelar</a>
        <button onClick={save} disabled={!canSave} style={{ ...btn, flex: 1, background: canSave ? color.primary : '#dfe3df', color: canSave ? '#fff' : color.inkFaint2, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </div>

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${color.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b3261e', marginBottom: 6 }}>Zona de risco</div>
        <p style={{ fontSize: 13, color: color.inkFaint2, margin: '0 0 12px' }}>Excluir a conta tira seus anúncios do ar e remove seus dados. Não dá pra desfazer.</p>
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
