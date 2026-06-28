'use client';

// Bottom sheet de filtros (mobile). Antes, cada toque num filtro navegava E fechava
// o sheet — pra aplicar 3 filtros o usuário reabria 3x, com reload a cada toque.
// Agora o sheet PERSISTE entre toques: os links carregam `fs=1`, então ao recarregar
// o sheet reabre (initialOpen) com as contagens já atualizadas. Um rodapé fixo
// "Ver N anúncios" aplica e fecha (navega pra URL sem fs); o backdrop também fecha.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { color, font, radius } from '../../lib/tokens';

type Labels = { trigger: string; apply: string; adSingular: string; adPlural: string };
const defaultLabels: Labels = { trigger: 'Filtros', apply: 'Ver anúncios', adSingular: 'anúncio', adPlural: 'anúncios' };

export function FilterSheet({ activeCount, total, applyHref, initialOpen, labels = defaultLabels, children }: { activeCount: number; total: number; applyHref: string; initialOpen: boolean; labels?: Labels; children: React.ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  const router = useRouter();

  function close() {
    setOpen(false);
    // Se o sheet estava persistido na URL (fs=1), navega pra versão sem fs pra não
    // reabrir num reload futuro. Sem fs ainda, basta fechar no client.
    if (initialOpen) router.push(applyHref);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={trigger}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="8" x2="21" y2="8" /><line x1="3" y1="16" x2="21" y2="16" />
          <circle cx="9" cy="8" r="2.6" fill="#fff" /><circle cx="15" cy="16" r="2.6" fill="#fff" />
        </svg>
        {labels.trigger}
        {activeCount > 0 && <span style={badge}>{activeCount}</span>}
      </button>

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(12,37,32,0.45)' }} />
          <div style={sheet}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}>
              <div style={{ width: 42, height: 5, borderRadius: 999, background: '#d8d0bd' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>{children}</div>
            <div style={footer}>
              <button onClick={close} style={applyBtn}>{labels.apply} · {total} {total === 1 ? labels.adSingular : labels.adPlural}</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const trigger: React.CSSProperties = { flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: color.ink, border: `1.5px solid ${color.lineChip}`, borderRadius: radius.pill, padding: '9px 15px', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const badge: React.CSSProperties = { background: color.primary, color: '#fff', fontSize: 10.5, fontWeight: 800, minWidth: 17, height: 17, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
const sheet: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 41, background: color.bg, borderRadius: '22px 22px 0 0', maxHeight: '86%', display: 'flex', flexDirection: 'column' };
const footer: React.CSSProperties = { padding: '12px 20px', borderTop: `1px solid ${color.line}`, background: color.bg, borderRadius: '0 0 22px 22px' };
const applyBtn: React.CSSProperties = { width: '100%', background: color.primary, color: '#fff', border: 'none', borderRadius: radius.btn, padding: 14, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' };
