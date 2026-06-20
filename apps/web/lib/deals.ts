import 'server-only';
import { db } from './db';

export class DealError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Vendedor confirma a venda (a partir da conversa) → cria o Deal.
export async function confirmSale(userId: string, conversationId: string) {
  const convo = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) throw new DealError('Conversa não encontrada.', 404);
  if (convo.sellerId !== userId) throw new DealError('Só o vendedor pode marcar como vendido.', 403);

  const deal = await db.deal.upsert({
    where: { conversationId },
    update: {},
    create: { conversationId, listingId: convo.listingId, sellerId: convo.sellerId, buyerId: convo.buyerId, status: 'seller_confirmed', sellerConfirmedAt: new Date() },
  });
  return deal.id;
}

// Vendedor marca "vendido pra esse comprador" a partir de um pedido aceito.
// 1 negócio por listing+comprador (mesmo com oferta E visita aceitas).
export async function confirmSaleFromRequest(userId: string, requestId: string) {
  const r = await db.request.findUnique({ where: { id: requestId } });
  if (!r) throw new DealError('Pedido não encontrado.', 404);
  if (r.sellerId !== userId) throw new DealError('Só o vendedor pode marcar como vendido.', 403);
  if (r.status !== 'accepted') throw new DealError('Aceite o pedido antes de marcar como vendido.', 400);

  const listing = await db.listing.findUnique({ where: { id: r.listingId }, select: { status: true, deletedAt: true } });
  if (!listing || listing.deletedAt) throw new DealError('Anúncio não encontrado.', 404);
  if (listing.status === 'sold') throw new DealError('Este anúncio já foi vendido.', 409);
  if (listing.status !== 'active' && listing.status !== 'paused') throw new DealError('Anúncio não está disponível.', 400);

  let deal = await db.deal.findFirst({ where: { listingId: r.listingId, buyerId: r.buyerId, sellerId: r.sellerId } });
  if (!deal) {
    deal = await db.deal.create({ data: { listingId: r.listingId, sellerId: r.sellerId, buyerId: r.buyerId, status: 'seller_confirmed', sellerConfirmedAt: new Date() } });
  } else if (deal.status !== 'completed' && !deal.sellerConfirmedAt) {
    deal = await db.deal.update({ where: { id: deal.id }, data: { status: 'seller_confirmed', sellerConfirmedAt: new Date() } });
  }
  return deal.id;
}

// Comprador confirma a compra → completa o negócio + marca anúncio vendido.
export async function confirmPurchase(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.buyerId !== userId) throw new DealError('Só o comprador confirma a compra.', 403);
  if (deal.status !== 'seller_confirmed') throw new DealError('Negócio não está aguardando confirmação.', 400);

  // Atômico: só marca vendido se o anúncio ainda está disponível. Se outro
  // comprador já fechou (updateMany.count === 0), abortamos — sem segundo "vendido"
  // nem segunda review válida. O índice único parcial em Deal(listingId) WHERE
  // status='completed' é a trava de DB que cobre a corrida real.
  await db.$transaction(async (tx) => {
    const updated = await tx.listing.updateMany({
      where: { id: deal.listingId, status: { in: ['active', 'paused'] } },
      data: { status: 'sold', soldToUserId: deal.buyerId },
    });
    if (updated.count === 0) throw new DealError('Este anúncio já foi vendido.', 409);
    await tx.deal.update({ where: { id: dealId }, data: { status: 'completed', buyerConfirmedAt: new Date() } });
    // Vendido → recusa os pedidos pendentes/aceitos dos outros compradores no mesmo
    // anúncio (o item não está mais disponível pra eles).
    await tx.request.updateMany({
      where: { listingId: deal.listingId, buyerId: { not: deal.buyerId }, status: { in: ['pending', 'accepted'] } },
      data: { status: 'declined' },
    });
  });
}

// Avaliação liberada assim que o negócio existe (não trava no aceite); fica PÚBLICA
// só quando o deal vira completed (os dois confirmam) — filtro em getProfile.
export async function createReview(userId: string, dealId: string, rating: number, comment?: string, tags?: string[]) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.status === 'cancelled') throw new DealError('Negócio cancelado.', 400);
  if (deal.buyerId !== userId && deal.sellerId !== userId) throw new DealError('Sem acesso.', 403);
  if (rating < 1 || rating > 5) throw new DealError('Nota inválida.', 400);

  const reviewedId = userId === deal.buyerId ? deal.sellerId : deal.buyerId;
  const cleanTags = (tags ?? []).filter((t) => typeof t === 'string').slice(0, 8);
  await db.review.upsert({
    where: { dealId_reviewerId: { dealId, reviewerId: userId } },
    update: { rating, comment: comment ?? null, tags: cleanTags },
    create: { dealId, reviewerId: userId, reviewedId, rating, comment: comment ?? null, tags: cleanTags },
  });
}

// Estado do deal para mostrar a ação certa no chat.
export async function dealForConversation(userId: string, conversationId: string) {
  const deal = await db.deal.findUnique({ where: { conversationId }, include: { reviews: true } });
  if (!deal) return null;
  const iAmSeller = deal.sellerId === userId;
  return {
    id: deal.id,
    status: deal.status,
    iAmSeller,
    iAmBuyer: deal.buyerId === userId,
    myReviewDone: deal.reviews.some((r) => r.reviewerId === userId),
  };
}
