'use client';

// Seletor on-brand pra listas longas (Marca, Modelo) — abre um bottom-sheet próprio
// com busca, no lugar do picker cinza do iOS (auditoria mobile #03). O campo fechado
// parece um .kl-select; aberto, é um painel inferior com busca + lista rolável.
import { useEffect, useRef, useState } from 'react';
import { color, font } from '../lib/tokens';

type Opt = { value: string; label: string };

export function SearchSelect({ value, placeholder = '—', options, onChange, disabled }: {
  value: string;
  placeholder?: string;
  options: Opt[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // trava o scroll do fundo enquanto o sheet está aberto
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const filtered = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setQ(''); setOpen(true); }}
        className="kl-select"
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: selected ? color.ink : color.inkFaint2, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.label : placeholder}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,28,25,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: '18px 18px 0 0', maxHeight: '78vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <div style={{ fontFamily: font.serif, fontSize: 17, fontWeight: 600, color: color.ink }}>Buscar</div>
              <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: '#f0ece2', color: color.inkMute, fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <input ref={inputRef} className="kl-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite para filtrar…" />
            </div>
            <div style={{ overflowY: 'auto', padding: '0 8px 12px', WebkitOverflowScrolling: 'touch' }}>
              {filtered.length === 0 && <div style={{ padding: '18px 16px', fontSize: 14, color: color.inkFaint2 }}>Nada encontrado.</div>}
              {filtered.map((o) => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '14px 14px', minHeight: 48, borderRadius: 12, border: 'none', background: on ? '#e8f1ec' : 'transparent', color: on ? color.primary : color.ink, fontFamily: font.sans, fontSize: 16, fontWeight: on ? 700 : 500, cursor: 'pointer' }}
                  >
                    <span>{o.label}</span>
                    {on && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
