'use client';

import { useEffect, useState } from 'react';
import { color } from '../lib/tokens';

const KEY = 'kitetropos:locale';
type Locale = 'pt' | 'en';

function readLocale(): Locale {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(KEY, locale);
  } catch {}
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const [locale, setLocale] = useState<Locale>('pt');

  useEffect(() => {
    setLocale(readLocale());
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((u) => {
        if (u?.locale === 'pt' || u?.locale === 'en') {
          setLocale(u.locale);
          saveLocale(u.locale);
        }
      })
      .catch(() => undefined);
  }, []);

  async function choose(next: Locale) {
    setLocale(next);
    saveLocale(next);
    document.documentElement.lang = next === 'en' ? 'en' : 'pt-BR';
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ locale: next }),
    }).catch(() => undefined);
  }

  const option = (value: Locale): React.CSSProperties => ({
    border: 'none',
    borderRadius: 999,
    background: locale === value ? color.primary : 'transparent',
    color: locale === value ? '#fff' : color.inkMute,
    cursor: 'pointer',
    fontSize: compact ? 11.5 : 12.5,
    fontWeight: 800,
    lineHeight: 1,
    minWidth: compact ? 30 : 34,
    padding: compact ? '7px 8px' : '8px 10px',
  });

  return (
    <div aria-label="Idioma" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 999, padding: 3 }}>
      <button type="button" onClick={() => choose('pt')} aria-pressed={locale === 'pt'} style={option('pt')}>PT</button>
      <button type="button" onClick={() => choose('en')} aria-pressed={locale === 'en'} style={option('en')}>EN</button>
    </div>
  );
}

export function storedLocale(): Locale {
  return readLocale();
}
