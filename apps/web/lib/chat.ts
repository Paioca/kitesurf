import 'server-only';
import { db } from './db';

export class ChatError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const userSelect = { id: true, name: true, avatarUrl: true, instagramHandle: true, phoneVerified: true };

// Comprador inicia (ou reabre) a conversa de um anúncio. 1 conversa por par.
export async function findOrCreateConversation(userId: string, listingId: string) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.deletedAt) throw new ChatError('Anúncio não encontrado.', 404);
  if (listing.userId === userId) throw new ChatError('Você é o dono deste anúncio.', 400);

  const convo = await db.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId: userId } },
    update: {},
    create: { listingId, buyerId: userId, sellerId: listing.userId },
  });
  return convo.id;
}

export async function listConversations(userId: string) {
  const convos = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }], status: { not: 'blocked' } },
    orderBy: { updatedAt: 'desc' },
    include: {
      listing: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
      buyer: { select: userSelect },
      seller: { select: userSelect },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { senderId: { not: userId }, readAt: null } } } },
    },
  });

  return convos.map((c) => {
    const role = c.buyerId === userId ? 'buying' : 'selling';
    const counterpart = role === 'buying' ? c.seller : c.buyer;
    const a = (c.listing.attributes ?? {}) as Record<string, any>;
    const last = c.messages[0];
    return {
      id: c.id,
      role,
      counterpart: { name: counterpart.name, avatarUrl: counterpart.avatarUrl, instagramHandle: counterpart.instagramHandle, phoneVerified: counterpart.phoneVerified },
      listing: { id: c.listing.id, title: c.listing.title, price: c.listing.price, thumb: c.listing.images[0]?.url ?? null, sizeM2: a.size_m2 != null ? String(a.size_m2) : null },
      last: last ? { body: last.imageUrl && !last.body ? '📷 Foto' : last.body, createdAt: last.createdAt } : null,
      unread: c._count.messages,
    };
  });
}

export async function getConversation(userId: string, id: string) {
  const c = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
      buyer: { select: userSelect },
      seller: { select: userSelect },
    },
  });
  if (!c) throw new ChatError('Conversa não encontrada.', 404);
  if (c.buyerId !== userId && c.sellerId !== userId) throw new ChatError('Sem acesso a esta conversa.', 403);

  // marca como lidas as mensagens da outra parte
  await db.message.updateMany({ where: { conversationId: id, senderId: { not: userId }, readAt: null }, data: { readAt: new Date() } });

  const messages = await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } });
  const role = c.buyerId === userId ? 'buying' : 'selling';
  const counterpart = role === 'buying' ? c.seller : c.buyer;
  const a = (c.listing.attributes ?? {}) as Record<string, any>;

  return {
    id: c.id,
    role,
    counterpart: { name: counterpart.name, avatarUrl: counterpart.avatarUrl, instagramHandle: counterpart.instagramHandle, phoneVerified: counterpart.phoneVerified },
    listing: { id: c.listing.id, title: c.listing.title, price: c.listing.price, thumb: c.listing.images[0]?.url ?? null, sizeM2: a.size_m2 != null ? String(a.size_m2) : null, shippable: c.listing.shippable },
    messages: messages.map((m) => ({ id: m.id, mine: m.senderId === userId, body: m.body, imageUrl: m.imageUrl, createdAt: m.createdAt })),
  };
}

export async function sendMessage(userId: string, id: string, body: string, imageUrl?: string) {
  const c = await db.conversation.findUnique({ where: { id } });
  if (!c) throw new ChatError('Conversa não encontrada.', 404);
  if (c.buyerId !== userId && c.sellerId !== userId) throw new ChatError('Sem acesso.', 403);
  if (c.status === 'blocked') throw new ChatError('Conversa bloqueada.', 403);
  const text = (body ?? '').trim();
  if (!text && !imageUrl) throw new ChatError('Mensagem vazia.', 400);

  const msg = await db.message.create({ data: { conversationId: id, senderId: userId, body: text, imageUrl: imageUrl ?? null } });
  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  return { id: msg.id, mine: true, body: msg.body, imageUrl: msg.imageUrl, createdAt: msg.createdAt };
}
