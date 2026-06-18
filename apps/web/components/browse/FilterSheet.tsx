'use client';

// Ilha client: só abre/fecha o bottom sheet no mobile. O conteúdo (children)
// é server-rendered (links na URL) — ao clicar num filtro, navega e fecha.
import { useState } from 'react';
import { color, font, radius } from '../../lib/tokens';

export function FilterSheet({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={trigger}>
        <span style={{ fontSize: 14 }}>⚙</span> Filtros
        {activeCount > 0 && <span style={badge}>{activeCount}</span>}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(12,37,32,0.45)' }} />
          <div style={sheet} onClick={() => setOpen(false)}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}>
              <div style={{ width: 42, height: 5, borderRadius: 999, background: '#d8d0bd' }} />
            </div>
            <div onClick={(e) => e.stopPropagation()}>{children}</div>
          </div>
        </>
      )}
    </>
  );
}

const trigger: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: color.primary, color: '#fff', border: 'none', borderRadius: radius.btn, padding: 13, fontFamily: font.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const badge: React.CSSProperties = { background: color.accent, color: color.accentInk, fontSize: 11, fontWeight: 800, minWidth: 19, height: 19, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
const sheet: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 41, background: color.bg, borderRadius: '22px 22px 0 0', maxHeight: '86%', overflowY: 'auto', padding: '8px 20px 24px' };
