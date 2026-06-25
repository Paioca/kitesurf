'use client';

// Busca textual livre (marca/modelo/título). Preserva os filtros já ativos na URL
// (não reseta categoria/tamanho/cidade) e volta pra página 1 a cada nova busca.
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { color, font, radius } from '../../lib/tokens';

export function SearchBox({ placeholder = 'Buscar por marca ou modelo' }: { placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  function go(next: string) {
    const sp = new URLSearchParams(params.toString());
    const v = next.trim();
    if (v) sp.set('q', v);
    else sp.delete('q');
    sp.delete('page'); // nova busca recomeça da 1ª página
    sp.set('b', '1'); // mantém na visão de resultados
    const s = sp.toString();
    router.push(s ? `/?${s}` : '/');
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); go(q); }} style={wrap}>
      <span style={{ fontSize: 15, color: color.inkFaint3, flex: 'none' }}>⌕</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label="Buscar equipamento"
        style={input}
      />
      {q && (
        <button type="button" onClick={() => { setQ(''); go(''); }} aria-label="Limpar busca" style={clearBtn}>✕</button>
      )}
      <button type="submit" style={submitBtn}>Buscar</button>
    </form>
  );
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${color.lineChip}`, borderRadius: radius.btn, padding: '4px 4px 4px 14px' };
const input: React.CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: font.sans, fontSize: 15, fontWeight: 500, color: color.ink, padding: '9px 0' };
const clearBtn: React.CSSProperties = { flex: 'none', background: 'transparent', border: 'none', color: color.inkFaint3, fontSize: 13, cursor: 'pointer', padding: '0 4px' };
const submitBtn: React.CSSProperties = { flex: 'none', background: color.primary, color: '#fff', border: 'none', borderRadius: radius.btn, padding: '9px 18px', fontFamily: font.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' };
