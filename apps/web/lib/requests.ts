import 'server-only';
import { db } from './db';

export class RequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Telefone (E.164) → link de WhatsApp. Só revelado quando o vendedor aceita.
export function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

const listingSel = { id: true, title: true, price: true, images: { orderBy: { position: 'asc' as const }, take: 1, select: { url: true, thumbUrl: true } } };

// Comprador faz oferta (valor) ou pede visita. 1 oferta + 1 visita por anúncio
// (re-oferecer atualiza o valor e volta pra pendente).
export async function createRequest(userId: string, listingId: string, type: 'offer' | 'visit', amount?: number | null) {
  const listing = await db.listing.findFirst({ where: { id: listingId, deletedAt: null } });
  if (!listing) throw new RequestError('Anúncio não encontrado.', 404);
  if (listing.userId === userId) throw new RequestError('Você é o dono deste anúncio.', 400);
  if (type === 'offer' && (!amount || amount < 100)) throw new RequestError('Informe um valor válido.', 400);
  return db.request.upsert({
    where: { listingId_buyerId_type: { listingId, buyerId: userId, type } },
    update: { amount: type === 'offer' ? amount! : null, status: 'pending' },
    create: { listingId, buyerId: userId, sellerId: listing.userId, type, amount: type === 'offer' ? amount! : null },
  });
}

// Vendedor aceita/recusa. Aceitar = libera o WhatsApp pro comprador.
export async function setRequestStatus(userId: string, id: string, status: 'accepted' | 'declined') {
  const r = await db.request.findUnique({ where: { id } });
  if (!r) throw new RequestError('Pedido não encontrado.', 404);
  if (r.sellerId !== userId) throw new RequestError('Sem permissão.', 403);
  await db.request.update({ where: { id }, data: { status } });
  return { ok: true, status };
}

function listingShape(l: any) {
  return { id: l.id, title: l.title, price: l.price, thumb: l.images[0]?.thumbUrl ?? l.images[0]?.url ?? null };
}

// Caixa de pedidos: recebidos (vendedor) + enviados (comprador). WhatsApp do
// vendedor só vem nos enviados que foram aceitos.
export async function getRequestsForUser(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    db.request.findMany({ where: { sellerId: userId }, orderBy: { updatedAt: 'desc' }, include: { listing: { select: listingSel }, buyer: { select: { name: true, avatarUrl: true } } } }),
    db.request.findMany({ where: { buyerId: userId }, orderBy: { updatedAt: 'desc' }, include: { listing: { select: listingSel }, seller: { select: { name: true, avatarUrl: true, phone: true } } } }),
  ]);
  return {
    incoming: incoming.map((r) => ({ id: r.id, type: r.type, amount: r.amount, status: r.status, listing: listingShape(r.listing), buyer: { name: r.buyer.name, avatarUrl: r.buyer.avatarUrl }, createdAt: r.createdAt.toISOString() })),
    outgoing: outgoing.map((r) => ({ id: r.id, type: r.type, amount: r.amount, status: r.status, listing: listingShape(r.listing), seller: { name: r.seller.name, avatarUrl: r.seller.avatarUrl }, whatsapp: r.status === 'accepted' ? waLink(r.seller.phone) : null, createdAt: r.createdAt.toISOString() })),
  };
}

// Estado dos pedidos do comprador num anúncio (pro detalhe).
export async function getListingRequestState(userId: string, listingId: string) {
  const reqs = await db.request.findMany({ where: { listingId, buyerId: userId }, include: { seller: { select: { phone: true } } } });
  const offer = reqs.find((r) => r.type === 'offer') ?? null;
  const visit = reqs.find((r) => r.type === 'visit') ?? null;
  const accepted = reqs.find((r) => r.status === 'accepted');
  return {
    offer: offer ? { status: offer.status, amount: offer.amount } : null,
    visit: visit ? { status: visit.status } : null,
    whatsapp: accepted ? waLink(accepted.seller.phone) : null,
  };
}
