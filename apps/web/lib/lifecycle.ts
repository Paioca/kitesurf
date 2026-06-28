import 'server-only';
import { db } from './db';
import { PublicError } from './http';
import { emitMany, affectedBuyerIds, favoriterIds } from './notifications';
import { listingHasSaleRecord } from './deals';
import { recordAudit } from './audit';

export class LifecycleError extends PublicError {}

// Remoção de anúncio pelo dono. Centraliza a transição: encerra pedidos abertos como
// `listing_removed` (não some sem explicação) e faz o soft-delete — tudo numa
// transação. BLOQUEIA se há venda aguardando confirmação (resolver antes) e — §10 —
// se o anúncio já registra uma venda (vendido ou negócio no histórico): aí fica
// imutável como registro, visível no /pedidos.
export async function removeListing(userId: string, listingId: string) {
  const listing = await db.listing.findFirst({ where: { id: listingId, deletedAt: null }, select: { id: true, userId: true, title: true, status: true } });
  if (!listing) throw new LifecycleError('Anúncio não encontrado.', 404);
  if (listing.userId !== userId) throw new LifecycleError('Sem permissão.', 403);

  const openDeal = await db.deal.count({ where: { listingId, status: 'seller_confirmed' } });
  if (openDeal > 0) {
    throw new LifecycleError('Há uma venda aguardando confirmação do comprador. Conclua ou cancele essa venda antes de excluir o anúncio.', 409);
  }

  // §10 — anúncio vendido é imutável: não pode ser excluído (preserva o registro do
  // negócio). Gatilho: Listing.sold OU qualquer Deal histórico/concluído.
  if (listing.status === 'sold' || (await listingHasSaleRecord(listingId))) {
    throw new LifecycleError('Este anúncio registra uma venda e não pode ser excluído. Ele fica no seu histórico como vendido.', 409);
  }

  await db.$transaction(async (tx) => {
    const affected = await affectedBuyerIds(tx, listingId); // antes de mudar o status
    await tx.request.updateMany({ where: { listingId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } });
    await tx.listing.update({ where: { id: listingId }, data: { deletedAt: new Date(), status: 'archived' } });
    await emitMany(tx, affected.map((bid) => ({ userId: bid, type: 'listing_removed' as const, listingId, actorId: userId, data: { title: listing.title } })));
    // quem favoritou (e não tinha pedido) também é avisado da remoção
    const favs = await favoriterIds(tx, listingId, affected);
    await emitMany(tx, favs.map((uid) => ({ userId: uid, type: 'listing_removed' as const, listingId, actorId: userId, data: { title: listing.title } })));
  });
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

  // Snapshot operacional ANTES da anonimização — necessário pra disputa/LGPD e pra
  // qualquer reclamação de "quem era esse usuário?" depois. Documentos sensíveis ficam
  // fora do audit mesmo que existam no schema.
  const priorState = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, lastName: true, email: true, phone: true, spot: true, country: true, instagramHandle: true, emailVerified: true, phoneVerified: true, status: true },
  });
  const auditBefore = priorState ? omitSensitiveAuditFields(priorState) : null;

  const now = new Date();
  await db.$transaction(async (tx) => {
    // compradores afetados pelos anúncios DESTE vendedor (antes de mudar o status)
    const affected = await tx.request.findMany({
      where: { sellerId: userId, status: { in: ['pending', 'accepted'] } },
      select: { buyerId: true, listingId: true }, distinct: ['buyerId', 'listingId'],
    });
    await tx.request.updateMany({ where: { buyerId: userId, status: { in: ['pending', 'accepted'] } }, data: { status: 'withdrawn' } });
    await tx.request.updateMany({ where: { sellerId: userId, status: { in: ['pending', 'accepted'] } }, data: { status: 'listing_removed' } });
    await tx.listing.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: now, status: 'archived' } });
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: now, status: 'blocked',
        name: 'Conta removida', avatarUrl: null, instagramHandle: null,
        phone: `deleted_${userId}`, email: `deleted_${userId}@removed.invalid`,
        // LGPD: apaga TODO o PII residual (não só telefone/email/nome). Histórico de
        // negócios concluídos e avaliações ficam — mas sem dado pessoal identificável.
        lastName: null, spot: null, country: null, cpf: null, payoutAccountId: null,
        emailVerified: false, phoneVerified: false,
      },
    });
    await emitMany(tx, affected.map((a) => ({ userId: a.buyerId, type: 'listing_removed' as const, listingId: a.listingId, actorId: userId })));
    // Audit DENTRO da transação: ou some/persiste junto com a anonimização.
    await recordAudit(tx, {
      actorUserId: userId,
      action: 'account.delete',
      entityType: 'user',
      entityId: userId,
      before: auditBefore,
      after: { name: 'Conta removida', email: `deleted_${userId}@removed.invalid`, phone: `deleted_${userId}`, status: 'blocked', deletedAt: now.toISOString() },
    });
  });
}

function omitSensitiveAuditFields<T extends Record<string, unknown>>(value: T) {
  const { cpf: _cpf, ...safeValue } = value;
  return safeValue;
}
