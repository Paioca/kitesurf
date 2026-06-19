'use client';

import { useState } from 'react';
import { color } from '../lib/tokens';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
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
      {busy ? 'Saindo…' : 'Sair da conta'}
    </button>
  );
}
