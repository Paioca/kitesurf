import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/session';
import { unreadCount } from '../../../../lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Badge da aba Pedidos. `unread` = notificações não-lidas (cobre OS DOIS lados:
// vendedor recebe pedido/confirmação/recusa; comprador recebe aceite/recusa/venda
// marcada/vendido-a-outro/anúncio-removido). `pending` mantido por compat.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ pending: 0, unread: 0 });
  const [pending, unread] = await Promise.all([
    db.request.count({ where: { sellerId: user.id, status: 'pending' } }),
    unreadCount(user.id),
  ]);
  return NextResponse.json({ pending, unread });
}
