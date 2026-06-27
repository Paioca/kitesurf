import 'server-only';
import { db } from './db';
import { PublicError } from './http';
import { emitMany, affectedBuyerIds } from './notifications';

export class ModerationError extends PublicError {}

export type ModAction = 'suspend_user' | 'restore_user' | 'remove_listing' | 'restore_listing';
const TARGET_OF: Record<ModAction, 'user' | 'listing'> = {
  suspend_user: 'user', restore_user: 'user', remove_listing: 'listing', restore_listing: 'listing',
};

// Executa uma ação de moderação (admin), em transação, e grava a trilha de auditoria
// (ModerationAction). Se vier de uma denúncia, marca a denúncia como resolvida.
export async function moderate(
  moderatorId: string,
  input: { reportId?: string | null; action: ModAction; targetId: string; note?: string | null },
) {
  const { action, targetId } = input;
  const targetType = TARGET_OF[action];
  if (!targetType) throw new ModerationError('Ação inválida.', 400);

  await db.$transaction(async (tx) => {
    if (action === 'suspend_user') {
      const u = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, admin: true } });
      if (!u) throw new ModerationError('Usuário não encontrado.', 404);
      if (u.admin) throw new ModerationError('Não é possível suspender um admin.', 400);
      const listings = await tx.listing.findMany({
        where: { userId: targetId, deletedAt: null, status: { in: ['active', 'paused'] } },
        select: { id: true, title: true },
      });
      const affected = await tx.request.findMany({
        where: { sellerId: targetId, status: { in: ['pending', 'accepted'] } },
        select: { buyerId: true, listingId: true },
        distinct: ['buyerId', 'listingId'],
      });
      // bump de sessionVersion mata as sessões ativas na hora (getCurrentUser invalida).
      await tx.user.update({ where: { id: targetId }, data: { status: 'blocked', sessionVersion: { increment: 1 } } });
      await tx.request.updateMany({ where: { sellerId: targetId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } });
      await tx.listing.updateMany({ where: { userId: targetId, deletedAt: null, status: { in: ['active', 'paused'] } }, data: { status: 'archived' } });
      const titleByListing = new Map(listings.map((l) => [l.id, l.title]));
      await emitMany(tx, affected.map((a) => ({ userId: a.buyerId, type: 'listing_removed' as const, listingId: a.listingId, actorId: moderatorId, data: { title: titleByListing.get(a.listingId) ?? '' } })));
    } else if (action === 'restore_user') {
      const u = await tx.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!u) throw new ModerationError('Usuário não encontrado.', 404);
      await tx.user.update({ where: { id: targetId }, data: { status: 'active' } });
    } else if (action === 'remove_listing') {
      const l = await tx.listing.findFirst({ where: { id: targetId }, select: { id: true, deletedAt: true, title: true } });
      if (!l) throw new ModerationError('Anúncio não encontrado.', 404);
      // captura compradores afetados ANTES de mudar o status, pra notificar.
      const affected = await affectedBuyerIds(tx, targetId);
      await tx.request.updateMany({ where: { listingId: targetId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } });
      await tx.listing.update({ where: { id: targetId }, data: { deletedAt: new Date(), status: 'archived' } });
      await emitMany(tx, affected.map((bid) => ({ userId: bid, type: 'listing_removed' as const, listingId: targetId, actorId: moderatorId, data: { title: l.title } })));
    } else if (action === 'restore_listing') {
      const l = await tx.listing.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!l) throw new ModerationError('Anúncio não encontrado.', 404);
      // volta como PAUSADO (não republica sozinho) — o dono reativa quando quiser.
      await tx.listing.update({ where: { id: targetId }, data: { deletedAt: null, status: 'paused' } });
    }

    await tx.moderationAction.create({
      data: { reportId: input.reportId ?? null, moderatorId, action, targetType, targetId, note: input.note ?? null },
    });
    if (input.reportId) {
      await tx.report.update({ where: { id: input.reportId }, data: { status: 'actioned' } });
    }
  });
}
