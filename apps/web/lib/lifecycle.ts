import 'server-only';
import { db } from './db';
import { PublicError } from './http';

export class LifecycleError extends PublicError {}

// Remoção de anúncio pelo dono. Centraliza a transição: encerra pedidos abertos como
// `listing_removed` (não some sem explicação) e faz o soft-delete — tudo numa
// transação. BLOQUEIA se há venda aguardando confirmação (resolver antes). Negócios
// `completed` continuam intactos: o anúncio vira registro histórico no /pedidos.
export async function removeListing(userId: string, listingId: string) {
  const listing = await db.listing.findFirst({ where: { id: listingId, deletedAt: null }, select: { id: true, userId: true } });
  if (!listing) throw new LifecycleError('Anúncio não encontrado.', 404);
  if (listing.userId !== userId) throw new LifecycleError('Sem permissão.', 403);

  const openDeal = await db.deal.count({ where: { listingId, status: 'seller_confirmed' } });
  if (openDeal > 0) {
    throw new LifecycleError('Há uma venda aguardando confirmação do comprador. Conclua ou cancele essa venda antes de excluir o anúncio.', 409);
  }

  await db.$transaction([
    db.request.updateMany({ where: { listingId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } }),
    db.listing.update({ where: { id: listingId }, data: { deletedAt: new Date(), status: 'archived' } }),
  ]);
}

// Exclusão de conta (soft + anonimização). Encerra pedidos abertos ANTES de anonimizar
// (senão sobram pedidos aceitos exibindo um WhatsApp que vira inválido): como comprador
// → `withdrawn`; como vendedor → os anúncios somem, pedidos viram `listing_removed`.
// BLOQUEIA se há venda aguardando confirmação (de qualquer lado). Histórico de negócios
// concluídos e avaliações são preservados.
export async function deleteAccount(userId: string) {
  const openDeal = await db.deal.count({ where: { status: 'seller_confirmed', OR: [{ sellerId: userId }, { buyerId: userId }] } });
  if (openDeal > 0) {
    throw new LifecycleError('Você tem uma venda aguardando confirmação. Conclua ou cancele antes de excluir a conta.', 409);
  }

  const now = new Date();
  await db.$transaction([
    db.request.updateMany({ where: { buyerId: userId, status: { in: ['pending', 'accepted'] } }, data: { status: 'withdrawn' } }),
    db.request.updateMany({ where: { sellerId: userId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } }),
    db.listing.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: now, status: 'archived' } }),
    db.user.update({
      where: { id: userId },
      data: {
        deletedAt: now, status: 'blocked',
        name: 'Conta removida', avatarUrl: null, instagramHandle: null,
        phone: `deleted_${userId}`, email: `deleted_${userId}@removed.invalid`,
      },
    }),
  ]);
}
