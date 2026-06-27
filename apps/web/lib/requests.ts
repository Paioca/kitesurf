import 'server-only';
import { db } from './db';
import { notifyNewRequest, notifyRequestAccepted } from './notify';
import { emit } from './notifications';
import { PublicError } from './http';
import { sellables, reservationConflict, COMPONENT_LABEL, type Component, type ListingLike } from './components';

export class RequestError extends PublicError {}

// Campos que o helper de componente precisa (ListingLike) — reusado nos selects.
const sellableSel = { status: true, hasBarra: true, price: true, kitePrice: true, barraPrice: true, kiteSoldAt: true, barraSoldAt: true } as const;

// Telefone (E.164) → link de WhatsApp. Só revelado quando a relação ainda
// permite contato; valores anonimizados por exclusão de conta não geram link.
export function waLink(phone?: string | null) {
  if (!phone || phone.startsWith('deleted_')) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

const CONTACT_HIDDEN_DEAL_STATUSES = new Set(['reversal_requested', 'disputed', 'reversed', 'closed_unconfirmed', 'voided']);

function contactAllowed(deal: { status: string } | null) {
  return !deal || !CONTACT_HIDDEN_DEAL_STATUSES.has(deal.status);
}

const listingSel = { id: true, title: true, price: true, status: true, images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, thumbUrl: true } } };

// Comprador faz oferta (valor) ou pede visita. 1 oferta + 1 visita por anúncio
// (re-oferecer atualiza o valor e volta pra pendente).
export async function createRequest(userId: string, listingId: string, type: 'offer' | 'visit', amount?: number | null, component: Component = 'conjunto') {
  const listing = await db.listing.findFirst({ where: { id: listingId, deletedAt: null }, select: { ...sellableSel, userId: true, title: true, user: { select: { phone: true } } } });
  if (!listing) throw new RequestError('Anúncio não encontrado.', 404);
  if (listing.status !== 'active') throw new RequestError('Este anúncio não está mais disponível.', 409);
  if (listing.userId === userId) throw new RequestError('Você é o dono deste anúncio.', 400);
  // disponibilidade da PEÇA pedida (não do anúncio inteiro).
  const sell = sellables(listing as ListingLike).find((s) => s.component === component);
  if (!sell) throw new RequestError('Esta opção não está à venda neste anúncio.', 400);
  if (!sell.available) throw new RequestError('Esta peça não está mais disponível.', 409);
  // §7 — reserve-block no backend: peça com venda aguardando confirmação não recebe
  // novas ofertas/visitas (esconder o botão não basta). Conjunto também bloqueia se
  // kite ou barra estiver reservado (matriz).
  const reservas = await db.deal.findMany({ where: { listingId, status: 'seller_confirmed' }, select: { component: true } });
  if (reservas.some((d) => reservationConflict(d.component, component))) {
    throw new RequestError('Esta peça está com uma venda em andamento. Tente mais tarde ou veja outra peça.', 409);
  }
  if (type === 'offer') {
    if (!amount || amount < 100) throw new RequestError('Informe um valor válido.', 400);
    if (amount > sell.price * 3) throw new RequestError('Valor muito acima do anúncio. Confira.', 400); // teto anti-erro de digitação
  }
  const buyer = await db.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
  // §12 — defesa adicional contra negociar consigo (o owner-check acima já cobre o caso
  // normal; telefone único torna isto redundante, mas fica como cinto de segurança).
  if (buyer && buyer.phone === listing.user.phone) throw new RequestError('Você não pode negociar com a própria conta.', 400);
  const title = component === 'conjunto' ? listing.title : `${listing.title} · ${COMPONENT_LABEL[component]}`;
  const r = await db.$transaction(async (tx) => {
    const req = await tx.request.upsert({
      where: { listingId_buyerId_type_component: { listingId, buyerId: userId, type, component } },
      update: { amount: type === 'offer' ? amount! : null, status: 'pending' },
      create: { listingId, buyerId: userId, sellerId: listing.userId, type, amount: type === 'offer' ? amount! : null, component },
    });
    await emit(tx, { userId: listing.userId, type: 'request_new', listingId, requestId: req.id, actorId: userId, data: { title, requestType: type, amount: amount ?? null } });
    return req;
  });
  // avisa o vendedor que há um novo pedido — SEM o contato do comprador. O telefone só
  // é liberado quando o vendedor ACEITA (regra de negócio: solicita → aceita → libera
  // WhatsApp). no-op se Twilio off.
  await notifyNewRequest({ sellerPhone: listing.user.phone, type, listingTitle: title, buyerName: buyer?.name ?? 'Um comprador' });
  return r;
}

// Vendedor aceita/recusa. Aceitar = libera o WhatsApp pro comprador.
export async function setRequestStatus(userId: string, id: string, status: 'accepted' | 'declined') {
  const r = await db.request.findUnique({ where: { id } });
  if (!r) throw new RequestError('Pedido não encontrado.', 404);
  if (r.sellerId !== userId) throw new RequestError('Sem permissão.', 403);
  if (r.status !== 'pending') throw new RequestError('Este pedido já foi respondido.', 409); // sem flip-flop nem re-revelar WhatsApp
  if (status === 'accepted') {
    const listing = await db.listing.findFirst({ where: { id: r.listingId, deletedAt: null }, select: sellableSel });
    if (!listing || listing.status !== 'active') throw new RequestError('Anúncio não está disponível.', 409);
    const sell = sellables(listing as ListingLike).find((s) => s.component === r.component);
    if (!sell?.available) throw new RequestError('Esta peça já foi vendida.', 409);
    // Pedido antigo também precisa respeitar reserva atual. createRequest já bloqueia
    // novas solicitações; sem isto, um pending antigo podia liberar WhatsApp depois de
    // outra venda entrar em seller_confirmed.
    const reservas = await db.deal.findMany({ where: { listingId: r.listingId, status: 'seller_confirmed' }, select: { component: true } });
    if (reservas.some((d) => reservationConflict(d.component, r.component))) {
      throw new RequestError('Esta peça está com uma venda em andamento. Cancele ou conclua a venda marcada antes de aceitar outro pedido.', 409);
    }
  }
  const lst = await db.listing.findUnique({ where: { id: r.listingId }, select: { title: true } });
  await db.$transaction(async (tx) => {
    await tx.request.update({ where: { id }, data: { status } });
    await emit(tx, {
      userId: r.buyerId,
      type: status === 'accepted' ? 'request_accepted' : 'request_declined',
      listingId: r.listingId, requestId: r.id, actorId: userId,
      data: { title: lst?.title ?? '' },
    });
  });
  // SMS de "interesse" pro comprador, FORA da transação (fetch awaited com timeout não
  // pode segurar a transação; fail-open não derruba o aceite já commitado).
  // §8 — devolvemos o link do WhatsApp do COMPRADOR pro vendedor abrir na MESMA aba
  // (o front faz window.location.assign no mesmo gesto — window.open pós-await é
  // bloqueado no Safari). Mantém um link só no momento da transição, sem segurar antes.
  let whatsapp: string | null = null;
  if (status === 'accepted') {
    const parties = await db.request.findUnique({ where: { id }, select: { buyer: { select: { phone: true } }, seller: { select: { phone: true } } } });
    if (parties?.buyer?.phone) {
      whatsapp = waLink(parties.buyer.phone);
      await notifyRequestAccepted({ buyerPhone: parties.buyer.phone, sellerPhone: parties.seller?.phone ?? '', listingTitle: lst?.title ?? '' });
    }
  }
  return { ok: true, status, whatsapp };
}

// Comprador desiste do próprio pedido (pendente OU aceito). Marcamos `withdrawn` em vez
// de apagar — preserva o histórico por status, e o upsert do createRequest deixa
// re-ofertar (withdrawn → pending). Já aceito: o contato compartilhado NÃO é revogável
// (só encerra o pedido). Se o vendedor já marcou vendido, o caminho é "não comprei"
// (denyPurchase), não a desistência — bloqueamos aqui.
export async function cancelRequest(userId: string, id: string) {
  const r = await db.request.findUnique({ where: { id } });
  if (!r) throw new RequestError('Pedido não encontrado.', 404);
  if (r.buyerId !== userId) throw new RequestError('Sem permissão.', 403);
  if (r.status !== 'pending' && r.status !== 'accepted') throw new RequestError('Este pedido não pode mais ser retirado.', 400);
  if (r.status === 'accepted') {
    const openDeal = await db.deal.count({ where: { listingId: r.listingId, buyerId: userId, sellerId: r.sellerId, component: r.component, status: 'seller_confirmed' } });
    if (openDeal > 0) throw new RequestError('O vendedor já marcou esta venda. Se você não comprou, use "Não comprei".', 409);
  }
  await db.request.update({ where: { id }, data: { status: 'withdrawn' } });
  return { ok: true, contactAlreadyShared: r.status === 'accepted' };
}

function listingShape(l: any) {
  return { id: l.id, title: l.title, price: l.price, status: l.status, thumb: l.images[0]?.thumbUrl ?? l.images[0]?.url ?? null };
}

// Caixa de pedidos: recebidos (vendedor) + enviados (comprador). WhatsApp do
// vendedor só vem nos enviados que foram aceitos.
const PEDIDOS_TAKE = 50; // teto de payload: os 50 mais recentes por aba (vendedor com muitos anúncios não baixa tudo)

export async function getRequestsForUser(userId: string) {
  const [incomingRaw, outgoingRaw, deals] = await Promise.all([
    db.request.findMany({ where: { sellerId: userId }, orderBy: { updatedAt: 'desc' }, take: PEDIDOS_TAKE + 1, include: { listing: { select: listingSel }, buyer: { select: { name: true, avatarUrl: true, phone: true } } } }),
    db.request.findMany({ where: { buyerId: userId }, orderBy: { updatedAt: 'desc' }, take: PEDIDOS_TAKE + 1, include: { listing: { select: listingSel }, seller: { select: { name: true, avatarUrl: true, phone: true } } } }),
    db.deal.findMany({ where: { OR: [{ sellerId: userId }, { buyerId: userId }] }, include: { reviews: { select: { reviewerId: true } }, disputes: { where: { status: { in: ['open', 'under_review'] } }, orderBy: { createdAt: 'desc' }, take: 1, select: { openedByUserId: true, reason: true } } } }),
  ]);
  // teto + flag "há mais" (sem count extra): pede 51, mostra 50.
  const moreIncoming = incomingRaw.length > PEDIDOS_TAKE;
  const moreOutgoing = outgoingRaw.length > PEDIDOS_TAKE;
  const incoming = incomingRaw.slice(0, PEDIDOS_TAKE);
  const outgoing = outgoingRaw.slice(0, PEDIDOS_TAKE);
  // chave inclui o COMPONENTE: comprador pode ter oferta no kite E na barra do mesmo
  // kit (deals distintos) — sem isso casaria o deal errado.
  const dkey = (l: string, b: string, s: string, c: string) => `${l}|${b}|${s}|${c}`;
  const dmap = new Map(deals.map((d) => [dkey(d.listingId, d.buyerId, d.sellerId, d.component), d]));
  const dealState = (r: any) => {
    const d = dmap.get(dkey(r.listingId, r.buyerId, r.sellerId, r.component));
    if (!d) return null;
    // disputa ativa (open = aguardando contraparte; under_review = na moderação): o
    // front precisa saber se EU pedi a correção pra escolher entre "Desistir" e
    // "Confirmar/Não concordo" (§11). reason só pra contraparte ver o motivo.
    const dispute = d.disputes[0] ?? null;
    return {
      id: d.id, status: d.status,
      iAmSeller: d.sellerId === userId, iAmBuyer: d.buyerId === userId,
      myReviewDone: d.reviews.some((rv) => rv.reviewerId === userId),
      iOpenedReversal: dispute ? dispute.openedByUserId === userId : false,
      reversalReason: dispute?.reason ?? null,
    };
  };
  const shape = (r: any) => ({ id: r.id, type: r.type, amount: r.amount, status: r.status, component: r.component, componentLabel: COMPONENT_LABEL[r.component as Component], listing: listingShape(r.listing), deal: dealState(r), createdAt: r.createdAt.toISOString() });
  const incomingShape = (r: any) => {
    const base = shape(r);
    return { ...base, buyer: { name: r.buyer.name, avatarUrl: r.buyer.avatarUrl, whatsapp: r.status === 'accepted' && contactAllowed(base.deal) ? waLink(r.buyer.phone) : null } };
  };
  const outgoingShape = (r: any) => {
    const base = shape(r);
    return { ...base, seller: { name: r.seller.name, avatarUrl: r.seller.avatarUrl }, whatsapp: r.status === 'accepted' && contactAllowed(base.deal) ? waLink(r.seller.phone) : null };
  };
  return {
    incoming: incoming.map(incomingShape),
    outgoing: outgoing.map(outgoingShape),
    moreIncoming, moreOutgoing,
  };
}

export type RequestState = {
  offer: { status: string; amount: number | null } | null;
  visit: { status: string } | null;
  whatsapp: string | null;
};

// Estado dos pedidos do comprador num anúncio, POR COMPONENTE (pro detalhe).
export async function getListingRequestState(userId: string, listingId: string): Promise<Record<Component, RequestState>> {
  const [reqs, deals] = await Promise.all([
    db.request.findMany({ where: { listingId, buyerId: userId }, include: { seller: { select: { phone: true } } } }),
    db.deal.findMany({ where: { listingId, buyerId: userId }, select: { listingId: true, buyerId: true, sellerId: true, component: true, status: true } }),
  ]);
  const dkey = (l: string, b: string, s: string, c: string) => `${l}|${b}|${s}|${c}`;
  const dmap = new Map(deals.map((d) => [dkey(d.listingId, d.buyerId, d.sellerId, d.component), d]));
  const forComp = (c: Component): RequestState => {
    const cr = reqs.filter((r) => r.component === c);
    const offer = cr.find((r) => r.type === 'offer') ?? null;
    const visit = cr.find((r) => r.type === 'visit') ?? null;
    const accepted = cr.find((r) => r.status === 'accepted');
    const acceptedDeal = accepted ? dmap.get(dkey(accepted.listingId, accepted.buyerId, accepted.sellerId, accepted.component)) ?? null : null;
    return {
      offer: offer ? { status: offer.status, amount: offer.amount } : null,
      visit: visit ? { status: visit.status } : null,
      whatsapp: accepted && contactAllowed(acceptedDeal) ? waLink(accepted.seller.phone) : null,
    };
  };
  return { conjunto: forComp('conjunto'), kite: forComp('kite'), barra: forComp('barra') };
}
