import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/session';
import { unreadCount } from '../../../../lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Badge da aba Pedidos = nº de notificações NÃO-LIDAS (cobre os dois lados: pedido novo,
// aceite/recusa, venda marcada, vendido-a-outro, anúncio removido). UMA query só — o
// `pending` antigo (count de requests) era redundante: o badge já derivava de `unread`.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unread: 0 });
  return NextResponse.json({ unread: await unreadCount(user.id) });
}
