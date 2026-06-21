import 'server-only';
import { db } from './db';
import { PublicError } from './http';
import { sellables, shouldCloseListing, type ListingLike, type Component } from './components';

export class DealError extends PublicError {}

const sellableSel = { status: true, hasBarra: true, price: true, kitePrice: true, barraPrice: true, kiteSoldAt: true, barraSoldAt: true } as const;

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

  const listing = await db.listing.findFirst({ where: { id: r.listingId, deletedAt: null }, select: sellableSel });
  if (!listing) throw new DealError('Anúncio não encontrado.', 404);
  if (listing.status !== 'active' && listing.status !== 'paused') throw new DealError('Anúncio não está disponível.', 400);
  const sell = sellables(listing as ListingLike).find((s) => s.component === r.component);
  if (!sell?.available) throw new DealError('Esta peça já foi vendida.', 409);

  // 1 negócio por listing+comprador+COMPONENTE (kite e barra do mesmo kit são deals distintos).
  let deal = await db.deal.findFirst({ where: { listingId: r.listingId, buyerId: r.buyerId, sellerId: r.sellerId, component: r.component } });
  if (!deal) {
    deal = await db.deal.create({ data: { listingId: r.listingId, sellerId: r.sellerId, buyerId: r.buyerId, component: r.component, status: 'seller_confirmed', sellerConfirmedAt: new Date() } });
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

  const listing = await db.listing.findFirst({ where: { id: deal.listingId, deletedAt: null }, select: sellableSel });
  if (!listing) throw new DealError('Anúncio não encontrado.', 404);
  const comp = deal.component;
  if (!sellables(listing as ListingLike).find((s) => s.component === comp)?.available) {
    throw new DealError('Esta peça já foi vendida.', 409);
  }
  const close = shouldCloseListing(listing as ListingLike, comp); // última peça → anúncio sold

  // Atômico POR COMPONENTE: o guard no where impede 2 confirmações da mesma peça
  // (count===0 → aborta). Índice único parcial Deal(listingId, component) WHERE
  // completed é a trava de DB. conjunto exige nenhuma peça vendida (kiteSoldAt/barraSoldAt null).
  await db.$transaction(async (tx) => {
    const where: Record<string, unknown> = { id: deal.listingId, status: { in: ['active', 'paused'] } };
    const data: Record<string, unknown> = {};
    if (comp === 'kite') {
      where.kiteSoldAt = null;
      data.kiteSoldAt = new Date();
      data.kiteSoldToUserId = deal.buyerId;
    } else if (comp === 'barra') {
      where.barraSoldAt = null;
      data.barraSoldAt = new Date();
      data.barraSoldToUserId = deal.buyerId;
    } else {
      where.kiteSoldAt = null; // conjunto só vende se nenhuma peça avulsa saiu
      where.barraSoldAt = null;
    }
    if (close) {
      data.status = 'sold';
      data.soldToUserId = deal.buyerId;
    }
    const updated = await tx.listing.updateMany({ where, data });
    if (updated.count === 0) throw new DealError('Esta peça já foi vendida.', 409);
    await tx.deal.update({ where: { id: dealId }, data: { status: 'completed', buyerConfirmedAt: new Date() } });
    // Encerra cirurgicamente o que ficou incompatível com OUTROS compradores: se fechou
    // o anúncio, tudo; se vendeu só uma peça, a MESMA peça + conjunto (kit incompleto),
    // preservando a outra peça ainda à venda. Pedidos viram `sold_elsewhere` (não
    // `declined` — recusa é decisão do vendedor; aqui foi vendido a outro).
    const compFilter = close ? {} : { component: { in: ['conjunto', comp] as Component[] } };
    await tx.request.updateMany({
      where: { listingId: deal.listingId, buyerId: { not: deal.buyerId }, status: { in: ['pending', 'accepted'] }, ...compFilter },
      data: { status: 'sold_elsewhere' },
    });
    // Invalida Deals `seller_confirmed` concorrentes (o vendedor pode ter marcado
    // vendido pra mais de um) — senão ficam órfãos esperando uma confirmação impossível.
    await tx.deal.updateMany({
      where: { listingId: deal.listingId, id: { not: dealId }, buyerId: { not: deal.buyerId }, status: 'seller_confirmed', ...compFilter },
      data: { status: 'voided' },
    });
  });
}

// Vendedor desfaz uma venda marcada por engano (antes do comprador confirmar).
// Zera os confirmados → o deal vira 'cancelled' e o vendedor pode marcar de novo
// (confirmSaleFromRequest reativa um deal sem sellerConfirmedAt). Listing não muda:
// só vira 'sold' no confirmPurchase, que aqui ainda não aconteceu.
export async function cancelSale(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.sellerId !== userId) throw new DealError('Só o vendedor pode cancelar a venda.', 403);
  if (deal.status !== 'seller_confirmed') throw new DealError('Só dá pra cancelar uma venda ainda não concluída.', 400);
  await db.deal.update({ where: { id: dealId }, data: { status: 'cancelled', sellerConfirmedAt: null, buyerConfirmedAt: null } });
}

// Comprador responde "não comprei" a uma venda que o vendedor marcou. Cancela o Deal
// e encerra a solicitação — SEM marcar o anúncio como vendido (a peça segue à venda).
export async function denyPurchase(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.buyerId !== userId) throw new DealError('Só o comprador pode responder a esta venda.', 403);
  if (deal.status !== 'seller_confirmed') throw new DealError('Esta venda não está aguardando sua confirmação.', 400);
  await db.$transaction([
    db.deal.update({ where: { id: dealId }, data: { status: 'cancelled', sellerConfirmedAt: null } }),
    db.request.updateMany({
      where: { listingId: deal.listingId, buyerId: deal.buyerId, sellerId: deal.sellerId, component: deal.component, status: { in: ['pending', 'accepted'] } },
      data: { status: 'withdrawn' },
    }),
  ]);
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

// Há negociação ABERTA pra um componente? (pedido aceito OU venda aguardando
// confirmação). Usado pra travar a remoção/edição de disponibilidade de uma peça
// com negócio em andamento — a transição de domínio fica centralizada aqui, não no route.
export async function openNegotiationExists(listingId: string, component: Component): Promise<boolean> {
  const [acceptedReq, openDeal] = await Promise.all([
    db.request.count({ where: { listingId, component, status: 'accepted' } }),
    db.deal.count({ where: { listingId, component, status: 'seller_confirmed' } }),
  ]);
  return acceptedReq > 0 || openDeal > 0;
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
