'use client';

// Toast global leve: provider montado no layout + hook useToast(). Some sozinho.
import { createContext, useCallback, useContext, useState } from 'react';
import { color } from '../lib/tokens';

type Tone = 'ok' | 'err';
type Toast = { id: number; msg: string; tone: Tone };
type Ctx = { show: (msg: string, tone?: Tone) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  // fallback no-op fora do provider (não quebra componentes isolados/testes)
  return ctx ?? { show: () => {} };
}

let seq = 0;
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, tone: Tone = 'ok') => {
    const id = ++seq;
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 9999, pointerEvents: 'none', padding: '0 16px' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              maxWidth: 420, width: 'fit-content', pointerEvents: 'auto',
              background: t.tone === 'err' ? '#b3261e' : color.ink, color: '#fff',
              fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, padding: '12px 16px',
              borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
              animation: 'kl-up 0.2s ease both',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
