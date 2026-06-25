'use client';

// Diálogo de confirmação global estilizado: substitui window.confirm() pelo visual da
// marca. Provider montado no layout + hook useConfirm() que retorna uma Promise<boolean>.
import { createContext, useCallback, useContext, useState } from 'react';
import { color } from '../lib/tokens';

type Opts = { title: string; body?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type Pending = Opts & { resolve: (ok: boolean) => void };
type Ctx = { confirm: (opts: Opts) => Promise<boolean> };

const ConfirmCtx = createContext<Ctx | null>(null);

export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmCtx);
  // fallback fora do provider: cai no nativo pra não quebrar componentes isolados/testes
  return ctx ?? { confirm: (o) => Promise.resolve(window.confirm(o.body ? `${o.title}\n\n${o.body}` : o.title)) };
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((opts: Opts) => new Promise<boolean>((resolve) => {
    setPending({ ...opts, resolve });
  }), []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20,28,24,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 18px 50px rgba(0,0,0,0.28)', animation: 'kl-up 0.18s ease both' }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: color.ink, lineHeight: 1.3 }}>{pending.title}</div>
            {pending.body && <div style={{ fontSize: 14, color: color.inkMute, lineHeight: 1.5, marginTop: 8 }}>{pending.body}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => close(false)} style={btnCancel}>{pending.cancelLabel ?? 'Cancelar'}</button>
              <button onClick={() => close(true)} style={pending.danger ? btnDanger : btnConfirm}>{pending.confirmLabel ?? 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

const btnBase: React.CSSProperties = { flex: 1, fontSize: 14.5, fontWeight: 700, padding: '12px 16px', borderRadius: 11, cursor: 'pointer' };
const btnCancel: React.CSSProperties = { ...btnBase, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink };
const btnConfirm: React.CSSProperties = { ...btnBase, background: color.primary, border: 'none', color: '#fff' };
const btnDanger: React.CSSProperties = { ...btnBase, background: '#b3261e', border: 'none', color: '#fff' };
