'use client';

// Lista de avisos (WhatsApp/SMS) que falharam de vez, com ação de operador "Tentar de
// novo" (reenfileira failed → pending; o cron drain reenvia em minutos). Atualização
// otimista: ao reenfileirar, a linha fica verde e o botão some. Telefone já chega
// mascarado do servidor — este componente nunca vê o número cru.
import { useState } from 'react';
import { color } from '../lib/tokens';
import { useToast } from './Toast';

export type FailedItem = { id: string; channel: string; kind: string; to: string; lastError: string; date: string };

export function FailedDeliveries({ items }: { items: FailedItem[] }) {
  const toast = useToast();
  const [state, setState] = useState<Record<string, 'idle' | 'busy' | 'done'>>({});

  async function requeue(id: string) {
    setState((s) => ({ ...s, [id]: 'busy' }));
    try {
      const res = await fetch(`/api/deliveries/${id}/requeue`, { method: 'POST' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message || 'Não deu pra reenfileirar.');
      }
      setState((s) => ({ ...s, [id]: 'done' }));
      toast.show('Reenfileirado — vai tentar reenviar em instantes.');
    } catch (e) {
      setState((s) => ({ ...s, [id]: 'idle' }));
      toast.show(e instanceof Error ? e.message : 'Não deu pra reenfileirar.', 'err');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((f) => {
        const st = state[f.id] ?? 'idle';
        const done = st === 'done';
        return (
          <div key={f.id} style={card}>
            <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 999, background: done ? color.primary : color.heart, flex: 'none', display: 'inline-block' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: color.ink }}>{f.kind}</div>
              <div style={{ fontSize: 13, color: color.inkMute }}>
                {done ? 'Reenfileirado — vai reenviar em instantes.' : `${f.channel.toUpperCase()} · para ${f.to} · ${f.date} · motivo: ${f.lastError}`}
              </div>
            </div>
            {!done && (
              <button onClick={() => requeue(f.id)} disabled={st === 'busy'} style={{ ...btn, opacity: st === 'busy' ? 0.6 : 1 }}>
                {st === 'busy' ? '…' : 'Tentar de novo'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const card: React.CSSProperties = { border: `1px solid ${color.lineCard}`, borderRadius: 14, background: color.surface, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 };
const btn: React.CSSProperties = { flex: 'none', border: `1px solid ${color.primary}`, background: 'transparent', color: color.primary, fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 10, cursor: 'pointer' };
