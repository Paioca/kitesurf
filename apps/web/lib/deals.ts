import 'server-only';
import type { DealStatus, DisputeReason } from '@prisma/client';
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
  // Marca a peça vendida + encerra concorrentes (helper compartilhado com o
  // encerramento-sem-confirmação), e notifica o vendedor.
  await db.$transaction(async (tx) => {
    await applyPieceSale(tx, deal, listing as ListingLike & { title: string }, 'completed');
    await emit(tx, { userId: deal.sellerId, type: 'purchase_confirmed', listingId: deal.listingId, dealId, actorId: deal.buyerId, data: { title: listing.title } });
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

// Marca a peça do deal como VENDIDA (mesma mutação do confirmPurchase) e encerra os
// concorrentes incompatíveis. Parametrizado pelo status final do deal: 'completed'
// (comprador confirmou) ou 'closed_unconfirmed' (vendedor encerrou após 72h).
async function applyPieceSale(tx: any, deal: { id: string; listingId: string; buyerId: string; component: Component }, listing: ListingLike & { title: string }, finalStatus: 'completed' | 'closed_unconfirmed') {
  const comp = deal.component;
  const close = shouldCloseListing(listing, comp);
  const where: Record<string, unknown> = { id: deal.listingId, status: { in: ['active', 'paused'] } };
  const data: Record<string, unknown> = {};
  if (comp === 'kite') { where.kiteSoldAt = null; data.kiteSoldAt = new Date(); data.kiteSoldToUserId = deal.buyerId; }
  else if (comp === 'barra') { where.barraSoldAt = null; data.barraSoldAt = new Date(); data.barraSoldToUserId = deal.buyerId; }
  else { where.kiteSoldAt = null; where.barraSoldAt = null; }
  if (close) { data.status = 'sold'; data.soldToUserId = deal.buyerId; }
  const updated = await tx.listing.updateMany({ where, data });
  if (updated.count === 0) throw new DealError('Esta peça já foi vendida.', 409);
  await tx.deal.update({ where: { id: deal.id }, data: finalStatus === 'completed' ? { status: 'completed', buyerConfirmedAt: new Date() } : { status: 'closed_unconfirmed', closedUnconfirmedAt: new Date() } });
  const compFilter = close ? {} : { component: { in: ['conjunto', comp] as Component[] } };
  const affected = await affectedBuyerIds(tx, deal.listingId, { excludeBuyerId: deal.buyerId, components: close ? undefined : ['conjunto', comp] });
  await tx.request.updateMany({ where: { listingId: deal.listingId, buyerId: { not: deal.buyerId }, status: { in: ['pending', 'accepted'] }, ...compFilter }, data: { status: 'sold_elsewhere' } });
  await tx.deal.updateMany({ where: { listingId: deal.listingId, id: { not: deal.id }, buyerId: { not: deal.buyerId }, status: 'seller_confirmed', ...compFilter }, data: { status: 'voided', confirmationDeadlineAt: null } });
  await emitMany(tx, affected.map((bid) => ({ userId: bid, type: 'sold_elsewhere' as const, listingId: deal.listingId, actorId: deal.buyerId, data: { title: listing.title } })));
}

// Reabre a peça vendida (reversão/correção): peça volta a paused, NUNCA active sozinha.
async function unmarkPieceSale(tx: any, listingId: string, comp: Component) {
  const data: Record<string, unknown> = {};
  if (comp === 'kite') { data.kiteSoldAt = null; data.kiteSoldToUserId = null; }
  else if (comp === 'barra') { data.barraSoldAt = null; data.barraSoldToUserId = null; }
  const l = await tx.listing.findUnique({ where: { id: listingId }, select: { status: true } });
  if (l?.status === 'sold' || l?.status === 'archived') { data.status = 'paused'; data.soldToUserId = null; }
  await tx.listing.update({ where: { id: listingId }, data });
}

// CRON (diário): encerra como vendido-sem-confirmação os deals seller_confirmed cujo
// prazo de 72h venceu. Idempotente (só pega seller_confirmed vencidos). Retorna a
// contagem. Protegido por CRON_SECRET no route que chama.
export async function closeUnconfirmedExpired(now = new Date()): Promise<number> {
  const venc = await db.deal.findMany({ where: { status: 'seller_confirmed', confirmationDeadlineAt: { lte: now } }, select: { id: true } });
  let n = 0;
  for (const { id } of venc) {
    try {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${id} FOR UPDATE`;
        const deal = await tx.deal.findUnique({ where: { id } });
        if (!deal || deal.status !== 'seller_confirmed') return; // corrida: alguém já mexeu
        const listing = await tx.listing.findFirst({ where: { id: deal.listingId, deletedAt: null }, select: { ...sellableSel, title: true } });
        if (!listing) { await tx.deal.update({ where: { id }, data: { status: 'cancelled', confirmationDeadlineAt: null } }); return; }
        await applyPieceSale(tx, deal, listing as ListingLike & { title: string }, 'closed_unconfirmed');
        await emit(tx, { userId: deal.buyerId, type: 'sale_closed_unconfirmed', listingId: deal.listingId, dealId: id, actorId: deal.sellerId, data: { title: listing.title } });
      });
      n++;
    } catch { /* segue pros outros */ }
  }
  return n;
}

// Vendedor corrige um encerramento-sem-confirmação (o comprador nunca confirmou, então
// é unilateral): a peça volta a paused e o deal vira cancelled. Fica no histórico.
export async function correctUnconfirmed(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.sellerId !== userId) throw new DealError('Só o vendedor pode corrigir.', 403);
  if (deal.status !== 'closed_unconfirmed') throw new DealError('Este negócio não está encerrado-sem-confirmação.', 400);
  await db.$transaction(async (tx) => {
    await unmarkPieceSale(tx, deal.listingId, deal.component);
    await tx.deal.update({ where: { id: dealId }, data: { status: 'cancelled' } });
  });
}

// REVERSÃO (§11) — só de venda completed; exige confirmação bilateral. Abre uma
// DealDispute (open) e põe o deal em reversal_requested aguardando a outra parte.
export async function requestReversal(userId: string, dealId: string, reason: DisputeReason, description?: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.status !== 'completed') throw new DealError('Só dá pra pedir correção de uma venda já confirmada pelos dois.', 400);
  if (deal.buyerId !== userId && deal.sellerId !== userId) throw new DealError('Sem acesso.', 403);
  const counterpartyId = userId === deal.buyerId ? deal.sellerId : deal.buyerId;
  const lst = await db.listing.findUnique({ where: { id: deal.listingId }, select: { title: true } });
  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { status: 'reversal_requested', reversalRequestedAt: new Date() } });
    await tx.dealDispute.create({ data: { dealId, openedByUserId: userId, counterpartyId, reason, description: description ?? null, status: 'open' } });
    await emit(tx, { userId: counterpartyId, type: 'reversal_requested', listingId: deal.listingId, dealId, actorId: userId, data: { title: lst?.title ?? '' } });
  });
}

// A contraparte responde à correção. Aceita → reversed (peça volta a paused, deixa de
// contar). Recusa → disputed + a DealDispute vai pra fila da moderação (under_review).
export async function respondReversal(userId: string, dealId: string, accept: boolean) {
  const deal = await db.deal.findUnique({ where: { id: dealId }, include: { disputes: { where: { status: 'open' }, orderBy: { createdAt: 'desc' }, take: 1 } } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.status !== 'reversal_requested') throw new DealError('Não há correção pendente neste negócio.', 400);
  const dispute = deal.disputes[0];
  if (!dispute) throw new DealError('Pedido de correção não encontrado.', 404);
  if (userId !== dispute.counterpartyId) throw new DealError('Só a outra parte pode responder à correção.', 403);
  const lst = await db.listing.findUnique({ where: { id: deal.listingId }, select: { title: true } });
  await db.$transaction(async (tx) => {
    if (accept) {
      await unmarkPieceSale(tx, deal.listingId, deal.component);
      await tx.deal.update({ where: { id: dealId }, data: { status: 'reversed', reversedAt: new Date() } });
      await tx.dealDispute.update({ where: { id: dispute.id }, data: { status: 'resolved_reversed', resolvedAt: new Date() } });
      await emit(tx, { userId: dispute.openedByUserId, type: 'reversal_confirmed', listingId: deal.listingId, dealId, actorId: userId, data: { title: lst?.title ?? '' } });
    } else {
      await tx.deal.update({ where: { id: dealId }, data: { status: 'disputed' } });
      await tx.dealDispute.update({ where: { id: dispute.id }, data: { status: 'under_review' } });
      await emit(tx, { userId: dispute.openedByUserId, type: 'reversal_rejected', listingId: deal.listingId, dealId, actorId: userId, data: { title: lst?.title ?? '' } });
    }
  });
}

// Quem pediu a correção desiste → volta a completed.
export async function cancelReversal(userId: string, dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId }, include: { disputes: { where: { status: 'open' }, orderBy: { createdAt: 'desc' }, take: 1 } } });
  if (!deal) throw new DealError('Negócio não encontrado.', 404);
  if (deal.status !== 'reversal_requested') throw new DealError('Não há correção pendente.', 400);
  const dispute = deal.disputes[0];
  if (!dispute || dispute.openedByUserId !== userId) throw new DealError('Só quem pediu a correção pode desistir.', 403);
  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { status: 'completed', reversalRequestedAt: null } });
    await tx.dealDispute.update({ where: { id: dispute.id }, data: { status: 'closed', resolvedAt: new Date() } });
  });
}

// MODERAÇÃO (§11) — o admin decide uma disputa em under_review (a contraparte recusou
// a correção). `uphold` mantém a venda → Deal volta a `completed` (segue como estava,
// volta a contar e a review reaparece). `reverse` reverte → Deal `reversed` + peça volta
// a paused (deixa de contar, review oculta permanente). Idempotente: só age sobre uma
// disputa under_review com o Deal em disputed. Notifica as duas partes (reusa
// reversal_confirmed/reversal_rejected — registros de badge, não há cópia por tipo).
export async function resolveDispute(adminId: string, disputeId: string, action: 'uphold' | 'reverse', resolution?: string) {
  const dispute = await db.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
  if (!dispute) throw new DealError('Disputa não encontrada.', 404);
  if (dispute.status !== 'under_review') throw new DealError('Esta disputa não está em análise.', 400);
  const deal = dispute.deal;
  if (deal.status !== 'disputed') throw new DealError('O negócio não está em disputa.', 409);
  const lst = await db.listing.findUnique({ where: { id: deal.listingId }, select: { title: true } });
  const parties = [dispute.openedByUserId, dispute.counterpartyId];
  await db.$transaction(async (tx) => {
    if (action === 'reverse') {
      await unmarkPieceSale(tx, deal.listingId, deal.component);
      await tx.deal.update({ where: { id: deal.id }, data: { status: 'reversed', reversedAt: new Date() } });
      await tx.dealDispute.update({ where: { id: dispute.id }, data: { status: 'resolved_reversed', resolvedByAdminId: adminId, resolvedAt: new Date(), resolution: resolution ?? null } });
      await emitMany(tx, parties.map((uid) => ({ userId: uid, type: 'reversal_confirmed' as const, listingId: deal.listingId, dealId: deal.id, actorId: adminId, data: { title: lst?.title ?? '' } })));
    } else {
      await tx.deal.update({ where: { id: deal.id }, data: { status: 'completed', reversalRequestedAt: null } });
      await tx.dealDispute.update({ where: { id: dispute.id }, data: { status: 'resolved_upheld', resolvedByAdminId: adminId, resolvedAt: new Date(), resolution: resolution ?? null } });
      await emitMany(tx, parties.map((uid) => ({ userId: uid, type: 'reversal_rejected' as const, listingId: deal.listingId, dealId: deal.id, actorId: adminId, data: { title: lst?.title ?? '' } })));
    }
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

// §10 — estados de Deal que tornam o anúncio um REGISTRO de venda: o dono não pode
// mais EXCLUIR (fica como histórico do negócio). Edição/reativação seguem governadas
// por listing-status + os guards por peça (kit parcialmente vendido segue gerenciável).
export const SOLD_RECORD_DEAL_STATUSES: DealStatus[] = ['completed', 'closed_unconfirmed', 'reversal_requested', 'disputed', 'reversed'];

// §4 — estados que CONTAM como venda no perfil: a venda segue contando provisoriamente
// durante a correção/disputa. Predicado DISTINTO da review pública (= só completed): em
// reversal_requested/disputed a venda conta, mas a review fica oculta. reversed não conta.
export const COUNTS_AS_SALE_STATUSES: DealStatus[] = ['completed', 'reversal_requested', 'disputed'];

export async function listingHasSaleRecord(listingId: string): Promise<boolean> {
  return (await db.deal.count({ where: { listingId, status: { in: SOLD_RECORD_DEAL_STATUSES } } })) > 0;
}

// Batch (sem N+1): quais dos listings têm venda registrada — pra "Meus anúncios".
export async function listingsWithSaleRecord(listingIds: string[]): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const rows = await db.deal.findMany({ where: { listingId: { in: listingIds }, status: { in: SOLD_RECORD_DEAL_STATUSES } }, select: { listingId: true }, distinct: ['listingId'] });
  return new Set(rows.map((r) => r.listingId));
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
