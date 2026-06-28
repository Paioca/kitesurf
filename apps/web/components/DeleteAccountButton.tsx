'use client';

import { useEffect, useState } from 'react';
import { color } from '../lib/tokens';

type Locale = 'pt' | 'en';
const COPY = {
  pt: {
    deleteAccount: 'Excluir minha conta',
    title: 'Excluir conta?',
    body: 'Seus anúncios serão removidos, negociações em aberto canceladas e seus dados pessoais anonimizados. Isso não pode ser desfeito.',
    genericError: 'Erro ao excluir conta. Tente novamente.',
    connectionError: 'Erro de conexão. Tente novamente.',
    cancel: 'Cancelar',
    deleting: 'Excluindo…',
    confirm: 'Sim, excluir',
  },
  en: {
    deleteAccount: 'Delete my account',
    title: 'Delete account?',
    body: 'Your listings will be removed, open deals cancelled, and your personal data anonymized. This cannot be undone.',
    genericError: 'Error deleting account. Try again.',
    connectionError: 'Connection error. Try again.',
    cancel: 'Cancel',
    deleting: 'Deleting…',
    confirm: 'Yes, delete',
  },
};
function readLocale(): Locale {
  try {
    return window.localStorage.getItem('kitetropos:locale') === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function DeleteAccountButton({ locale: initialLocale = 'pt' }: { locale?: Locale }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => setLocale(readLocale()), []);
  const t = COPY[locale];

  async function handleDelete() {
    setStep('busy');
    setError(null);
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? t.genericError);
        setStep('confirm');
        return;
      }
      window.location.href = '/';
    } catch {
      setError(t.connectionError);
      setStep('confirm');
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        style={{ width: '100%', background: 'transparent', border: 'none', color: '#b3261e', fontSize: 13.5, fontWeight: 500, padding: '10px 18px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
      >
        {t.deleteAccount}
      </button>
    );
  }

  return (
    <div style={{ background: '#fff', border: `1.5px solid #f2c4c1`, borderRadius: 12, padding: '16px 18px', marginTop: 8 }}>
      <p style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 700, color: '#b3261e' }}>{t.title}</p>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: color.inkFaint, lineHeight: 1.5 }}>
        {t.body}
      </p>
      {error && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#b3261e', fontWeight: 600 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { setStep('idle'); setError(null); }}
          disabled={step === 'busy'}
          style={{ flex: 1, background: color.bg, border: `1.5px solid ${color.lineCard}`, color: color.ink, fontSize: 14, fontWeight: 600, padding: '11px 0', borderRadius: 10, cursor: 'pointer' }}
        >
          {t.cancel}
        </button>
        <button
          onClick={handleDelete}
          disabled={step === 'busy'}
          style={{ flex: 1, background: '#b3261e', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 0', borderRadius: 10, cursor: step === 'busy' ? 'default' : 'pointer', opacity: step === 'busy' ? 0.7 : 1 }}
        >
          {step === 'busy' ? t.deleting : t.confirm}
        </button>
      </div>
    </div>
  );
}
