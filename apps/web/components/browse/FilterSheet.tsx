'use client';

// Bottom sheet de filtros (mobile). Antes, cada toque num filtro navegava E fechava
// o sheet — pra aplicar 3 filtros o usuário reabria 3x, com reload a cada toque.
// Agora o sheet PERSISTE entre toques: os links carregam `fs=1`, então ao recarregar
// o sheet reabre (initialOpen) com as contagens já atualizadas. Um rodapé fixo
// "Ver N anúncios" aplica e fecha (navega pra URL sem fs); o backdrop também fecha.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { color, font, radius } from '../../lib/tokens';

export function FilterSheet({ activeCount, total, applyHref, initialOpen, children }: { activeCount: number; total: number; applyHref: string; initialOpen: boolean; children: React.ReactNode }) {
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
        <span style={{ fontSize: 14 }}>⚙</span> Filtros
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
              <button onClick={close} style={applyBtn}>Ver {total} {total === 1 ? 'anúncio' : 'anúncios'}</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const trigger: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: color.primary, color: '#fff', border: 'none', borderRadius: radius.btn, padding: 13, fontFamily: font.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const badge: React.CSSProperties = { background: color.primary, color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 19, height: 19, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
const sheet: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 41, background: color.bg, borderRadius: '22px 22px 0 0', maxHeight: '86%', display: 'flex', flexDirection: 'column' };
const footer: React.CSSProperties = { padding: '12px 20px', borderTop: `1px solid ${color.line}`, background: color.bg, borderRadius: '0 0 22px 22px' };
const applyBtn: React.CSSProperties = { width: '100%', background: color.primary, color: '#fff', border: 'none', borderRadius: radius.btn, padding: 14, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' };
