import 'server-only';
import type { Prisma, NotificationType } from '@prisma/client';
import { db } from './db';

// Cliente de transação (forma interativa). As notificações são emitidas DENTRO da
// transação da transição — se a transição der rollback, a notificação não nasce.
type Tx = Prisma.TransactionClient;

export type NotifInput = {
  userId: string;
  type: NotificationType;
  listingId?: string | null;
  requestId?: string | null;
  dealId?: string | null;
  actorId?: string | null;
  data?: Prisma.InputJsonValue;
};

const toRow = (n: NotifInput) => ({
  userId: n.userId,
  type: n.type,
  listingId: n.listingId ?? null,
  requestId: n.requestId ?? null,
  dealId: n.dealId ?? null,
  actorId: n.actorId ?? null,
  data: n.data ?? undefined,
});

function duplicateWhere(n: NotifInput): Prisma.NotificationWhereInput {
  return {
    userId: n.userId,
    type: n.type,
    listingId: n.listingId ?? null,
    requestId: n.requestId ?? null,
    dealId: n.dealId ?? null,
    actorId: n.actorId ?? null,
  };
}

export async function emit(tx: Tx, n: NotifInput) {
  const existing = await tx.notification.findFirst({ where: duplicateWhere(n), select: { id: true } });
  if (existing) return;
  await tx.notification.create({ data: toRow(n) });
}

export async function emitMany(tx: Tx, ns: NotifInput[]) {
  for (const n of ns) await emit(tx, n);
}

// Compradores afetados (ids distintos) de pedidos abertos de um anúncio — usado pra
// notificar `sold_elsewhere` / `listing_removed`. Roda dentro da transação.
export async function affectedBuyerIds(tx: Tx, listingId: string, opts: { excludeBuyerId?: string; components?: string[] } = {}): Promise<string[]> {
  const rows = await tx.request.findMany({
    where: {
      listingId,
      status: { in: ['pending', 'accepted'] },
      ...(opts.excludeBuyerId ? { buyerId: { not: opts.excludeBuyerId } } : {}),
      ...(opts.components ? { component: { in: opts.components as any } } : {}),
    },
    select: { buyerId: true },
    distinct: ['buyerId'],
  });
  return rows.map((r) => r.buyerId);
}

// ---- leitura (fora de transação) ----

export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, take = 30) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
}

export async function listUnreadNotifications(userId: string, take = 12) {
  return db.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: 'desc' }, take });
}

// Marca lidas: todas (sem ids) ou um subconjunto do próprio usuário.
export async function markRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids && ids.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
