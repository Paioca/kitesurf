import 'server-only';
import { db } from './db';
import { PublicError } from './http';
import { sellables, shouldCloseListing, reservationConflict, type ListingLike, type Component } from './components';
import { emit, emitMany, affectedBuyerIds } from './notifications';

export class DealError extends PublicError {}

const RESERVE_HOURS = 72; // prazo do comprador confirmar antes do vendedor poder encerrar

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

  const listing = await db.listing.findFirst({ where: { id: r.listingId, deletedAt: null }, select: { ...sellableSel, title: true } });
  if (!listing) throw new DealError('Anúncio não encontrado.', 404);
  if (listing.status !== 'active' && listing.status !== 'paused') throw new DealError('Anúncio não está disponível.', 400);
  const sell = sellables(listing as ListingLike).find((s) => s.component === r.component);
  if (!sell?.available) throw new DealError('Esta peça já foi vendida.', 409);

  // 1 negócio por listing+comprador+COMPONENTE (kite e barra do mesmo kit são deals distintos).
  const existing = await db.deal.findFirst({ where: { listingId: r.listingId, buyerId: r.buyerId, sellerId: r.sellerId, component: r.component } });
  // Notifica o comprador (sale_marked) só quando o deal PASSA a aguardar confirmação.
  const becomesPending = !existing || (existing.status !== 'completed' && !existing.sellerConfirmedAt);
  if (existing && !becomesPending) return existing.id;

  return db.$transaction(async (tx) => {
    // TRAVA por unidade física (§3): lock da linha do Listing serializa marcações
    // concorrentes; dentro do lock, rejeita se já há reserva pendente que conflite.
    // O índice único parcial seller_confirmed por (listingId, component) é o backstop.
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${r.listingId} FOR UPDATE`;
    const pendentes = await tx.deal.findMany({
      where: { listingId: r.listingId, status: 'seller_confirmed' },
      select: { id: true, component: true, buyerId: true },
    });
    const conflito = pendentes.find((d) => reservationConflict(d.component, r.component) && !(existing && d.id === existing.id));
    if (conflito) throw new DealError('Já existe uma venda aguardando confirmação para esta peça. Cancele a anterior antes de escolher outro comprador.', 409);

    const sellerConfirmedAt = new Date();
    const confirmationDeadlineAt = new Date(sellerConfirmedAt.getTime() + RESERVE_HOURS * 3600 * 1000);
    const deal = existing
      ? await tx.deal.update({ where: { id: existing.id }, data: { status: 'seller_confirmed', sellerConfirmedAt, confirmationDeadlineAt } })
      : await tx.deal.create({ data: { listingId: r.listingId, sellerId: r.sellerId, buyerId: r.buyerId, component: r.component, status: 'seller_confirmed', sellerConfirmedAt, confirmationDeadlineAt } });
    await emit(tx, { userId: r.buyerId, type: 'sale_marked', listingId: r.listingId, requestId: r.id, dealId: deal.id, actorId: r.sellerId, data: { title: listing.title } });
    return deal.id;
  });
}

// Comprador confirma a compra → completa o negócio + marca anúncio vendido.
export async function confirmPurchase(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.buyerId !== userId) throw new DealError('Só o comprador confirma a compra.', 403);
  if (deal.status !== 'seller_confirmed') throw new DealError('Negócio não está aguardando confirmação.', 400);

  const listing = await db.listing.findFirst({ where: { id: deal.listingId, deletedAt: null }, select: { ...sellableSel, title: true } });
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
    // Captura os compradores afetados ANTES de mudar o status (depois o filtro
    // pending/accepted não os pega mais) — pra notificar `sold_elsewhere`.
    const affected = await affectedBuyerIds(tx, deal.listingId, { excludeBuyerId: deal.buyerId, components: close ? undefined : ['conjunto', comp] });
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
    // Notifica: vendedor (compra confirmada) + compradores afetados (vendido a outro).
    await emit(tx, { userId: deal.sellerId, type: 'purchase_confirmed', listingId: deal.listingId, dealId, actorId: deal.buyerId, data: { title: listing.title } });
    await emitMany(tx, affected.map((bid) => ({ userId: bid, type: 'sold_elsewhere' as const, listingId: deal.listingId, actorId: deal.buyerId, data: { title: listing.title } })));
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
  // Notifica o comprador — ele tinha uma venda marcada esperando confirmação (teste #15).
  const lst = await db.listing.findUnique({ where: { id: deal.listingId }, select: { title: true } });
  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { status: 'cancelled', sellerConfirmedAt: null, buyerConfirmedAt: null, confirmationDeadlineAt: null } });
    await emit(tx, { userId: deal.buyerId, type: 'sale_cancelled', listingId: deal.listingId, dealId, actorId: deal.sellerId, data: { title: lst?.title ?? '' } });
  });
}

// Comprador responde "não comprei" a uma venda que o vendedor marcou. Cancela o Deal
// e encerra a solicitação — SEM marcar o anúncio como vendido (a peça segue à venda).
export async function denyPurchase(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.buyerId !== userId) throw new DealError('Só o comprador pode responder a esta venda.', 403);
  if (deal.status !== 'seller_confirmed') throw new DealError('Esta venda não está aguardando sua confirmação.', 400);
  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { status: 'cancelled', sellerConfirmedAt: null, confirmationDeadlineAt: null } });
    await tx.request.updateMany({
      where: { listingId: deal.listingId, buyerId: deal.buyerId, sellerId: deal.sellerId, component: deal.component, status: { in: ['pending', 'accepted'] } },
      data: { status: 'withdrawn' },
    });
    await emit(tx, { userId: deal.sellerId, type: 'purchase_denied', listingId: deal.listingId, dealId, actorId: deal.buyerId });
  });
}

// Avaliação liberada assim que o negócio existe (não trava no aceite); fica PÚBLICA
// só quando o deal vira completed (os dois confirmam) — filtro em getProfile.
export async function createReview(userId: string, dealId: string, rating: number, comment?: string, tags?: string[]) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  // Avaliação SÓ depois da confirmação dos dois lados (§4). Bloqueia todos os demais
  // estados — seller_confirmed (ainda não confirmado), cancelled, voided,
  // closed_unconfirmed, reversal_requested, reversed, disputed.
  if (deal.status !== 'completed') throw new DealError('A avaliação só é liberada depois da compra confirmada pelos dois.', 400);
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
