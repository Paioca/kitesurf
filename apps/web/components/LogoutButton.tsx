'use client';

import { useEffect, useState } from 'react';
import { color } from '../lib/tokens';

type Locale = 'pt' | 'en';
const COPY = {
  pt: { leaving: 'Saindo…', logout: 'Sair da conta' },
  en: { leaving: 'Signing out…', logout: 'Sign out' },
};
function readLocale(): Locale {
  try {
    return window.localStorage.getItem('kitetropos:locale') === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

export function LogoutButton({ locale: initialLocale = 'pt' }: { locale?: Locale }) {
  const [busy, setBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => setLocale(readLocale()), []);
  const t = COPY[locale];
  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }
  return (
    <button onClick={logout} disabled={busy} style={{ width: '100%', background: '#fff', border: `1.5px solid ${color.lineCard}`, color: '#b3261e', fontSize: 14.5, fontWeight: 700, padding: '13px 18px', borderRadius: 12, cursor: busy ? 'default' : 'pointer' }}>
      {busy ? t.leaving : t.logout}
    </button>
  );
}
