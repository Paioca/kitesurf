// Texto humano por tipo de notificação (feed in-app). Cada transição da máquina de
// estados emite um Notification tipado, com data.{title} quando há. Antes esse tipo era
// descartado e só sobrava um número no sininho; aqui vira uma frase que diz o que mudou.
export type NotificationLike = { type: string; data?: unknown };

export function notificationText(n: NotificationLike): string {
  const d = (n.data ?? {}) as { title?: string; requestType?: 'offer' | 'visit'; amount?: number | null };
  const t = d.title ? `"${d.title}"` : 'seu anúncio';
  switch (n.type) {
    case 'request_new': {
      const tipo = d.requestType === 'visit' ? 'um pedido de visita' : 'uma oferta';
      return `Você recebeu ${tipo} em ${d.title ? `"${d.title}"` : 'um anúncio seu'}.`;
    }
    case 'request_accepted': return `O vendedor liberou o contato em ${t}. O WhatsApp aparece nos seus pedidos.`;
    case 'request_declined': return `Seu pedido em ${t} foi recusado.`;
    case 'sale_marked': return `O vendedor marcou a venda de ${t}. Confirme se você comprou.`;
    case 'purchase_confirmed': return `O comprador confirmou a compra de ${t}.`;
    case 'purchase_denied': return `O comprador respondeu que não comprou${d.title ? ` ${t}` : ''}.`;
    case 'sale_cancelled': return `O vendedor cancelou a venda marcada de ${t}.`;
    case 'sale_closed_unconfirmed': return `A venda de ${t} foi encerrada por falta de confirmação no prazo.`;
    case 'sold_elsewhere': return `${t} foi vendido a outro comprador.`;
    case 'listing_removed': return d.title ? `O anúncio ${t} foi removido.` : 'Um anúncio que você acompanhava foi removido.';
    case 'reversal_requested': return `Pediram a correção da venda de ${t}. Responda nos seus pedidos.`;
    case 'reversal_confirmed': return `A correção da venda de ${t} foi confirmada.`;
    case 'reversal_rejected': return `A correção da venda de ${t} não foi aceita — está em análise.`;
    default: return 'Você tem uma novidade nas suas negociações.';
  }
}

// Tempo relativo curto em pt-BR ("agora", "há 5 min", "há 2 h", "há 3 d", "há 1 sem").
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `há ${w} sem`;
  const mo = Math.floor(d / 30);
  return `há ${mo} ${mo > 1 ? 'meses' : 'mês'}`;
}
