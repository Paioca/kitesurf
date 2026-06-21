import 'server-only';
import { db } from './db';
import { notifyNewRequest } from './notify';
import { PublicError } from './http';
import { sellables, COMPONENT_LABEL, type Component, type ListingLike } from './components';

export class RequestError extends PublicError {}

// Campos que o helper de componente precisa (ListingLike) — reusado nos selects.
const sellableSel = { status: true, hasBarra: true, price: true, kitePrice: true, barraPrice: true, kiteSoldAt: true, barraSoldAt: true } as const;

// Telefone (E.164) → link de WhatsApp. Só revelado quando o vendedor aceita.
export function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

const listingSel = { id: true, title: true, price: true, images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, thumbUrl: true } } };

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
  if (type === 'offer') {
    if (!amount || amount < 100) throw new RequestError('Informe um valor válido.', 400);
    if (amount > sell.price * 3) throw new RequestError('Valor muito acima do anúncio — confira.', 400); // teto anti-erro de digitação
  }
  const buyer = await db.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
  const r = await db.request.upsert({
    where: { listingId_buyerId_type_component: { listingId, buyerId: userId, type, component } },
    update: { amount: type === 'offer' ? amount! : null, status: 'pending' },
    create: { listingId, buyerId: userId, sellerId: listing.userId, type, amount: type === 'offer' ? amount! : null, component },
  });
  // avisa o vendedor já com o contato do comprador (pode chamar direto). no-op se Twilio off.
  const title = component === 'conjunto' ? listing.title : `${listing.title} · ${COMPONENT_LABEL[component]}`;
  await notifyNewRequest({ sellerPhone: listing.user.phone, type, listingTitle: title, buyerName: buyer?.name ?? 'Um comprador', buyerPhone: buyer?.phone ?? '' });
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
  }
  await db.request.update({ where: { id }, data: { status } });
  return { ok: true, status };
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
  return { id: l.id, title: l.title, price: l.price, thumb: l.images[0]?.thumbUrl ?? l.images[0]?.url ?? null };
}

// Caixa de pedidos: recebidos (vendedor) + enviados (comprador). WhatsApp do
// vendedor só vem nos enviados que foram aceitos.
export async function getRequestsForUser(userId: string) {
  const [incoming, outgoing, deals] = await Promise.all([
    db.request.findMany({ where: { sellerId: userId }, orderBy: { updatedAt: 'desc' }, include: { listing: { select: listingSel }, buyer: { select: { name: true, avatarUrl: true, phone: true } } } }),
    db.request.findMany({ where: { buyerId: userId }, orderBy: { updatedAt: 'desc' }, include: { listing: { select: listingSel }, seller: { select: { name: true, avatarUrl: true, phone: true } } } }),
    db.deal.findMany({ where: { OR: [{ sellerId: userId }, { buyerId: userId }] }, include: { reviews: { select: { reviewerId: true } } } }),
  ]);
  // chave inclui o COMPONENTE: comprador pode ter oferta no kite E na barra do mesmo
  // kit (deals distintos) — sem isso casaria o deal errado.
  const dkey = (l: string, b: string, s: string, c: string) => `${l}|${b}|${s}|${c}`;
  const dmap = new Map(deals.map((d) => [dkey(d.listingId, d.buyerId, d.sellerId, d.component), d]));
  const dealState = (r: any) => {
    const d = dmap.get(dkey(r.listingId, r.buyerId, r.sellerId, r.component));
    if (!d) return null;
    return { id: d.id, status: d.status, iAmSeller: d.sellerId === userId, iAmBuyer: d.buyerId === userId, myReviewDone: d.reviews.some((rv) => rv.reviewerId === userId) };
  };
  const shape = (r: any) => ({ id: r.id, type: r.type, amount: r.amount, status: r.status, component: r.component, componentLabel: COMPONENT_LABEL[r.component as Component], listing: listingShape(r.listing), deal: dealState(r), createdAt: r.createdAt.toISOString() });
  return {
    incoming: incoming.map((r) => ({ ...shape(r), buyer: { name: r.buyer.name, avatarUrl: r.buyer.avatarUrl, whatsapp: waLink(r.buyer.phone) } })),
    outgoing: outgoing.map((r) => ({ ...shape(r), seller: { name: r.seller.name, avatarUrl: r.seller.avatarUrl }, whatsapp: r.status === 'accepted' ? waLink(r.seller.phone) : null })),
  };
}

export type RequestState = {
  offer: { status: string; amount: number | null } | null;
  visit: { status: string } | null;
  whatsapp: string | null;
};

// Estado dos pedidos do comprador num anúncio, POR COMPONENTE (pro detalhe).
export async function getListingRequestState(userId: string, listingId: string): Promise<Record<Component, RequestState>> {
  const reqs = await db.request.findMany({ where: { listingId, buyerId: userId }, include: { seller: { select: { phone: true } } } });
  const forComp = (c: Component): RequestState => {
    const cr = reqs.filter((r) => r.component === c);
    const offer = cr.find((r) => r.type === 'offer') ?? null;
    const visit = cr.find((r) => r.type === 'visit') ?? null;
    const accepted = cr.find((r) => r.status === 'accepted');
    return {
      offer: offer ? { status: offer.status, amount: offer.amount } : null,
      visit: visit ? { status: visit.status } : null,
      whatsapp: accepted ? waLink(accepted.seller.phone) : null,
    };
  };
  return { conjunto: forComp('conjunto'), kite: forComp('kite'), barra: forComp('barra') };
}
