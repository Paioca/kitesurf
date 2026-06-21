import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    notification: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
    request: { findMany: vi.fn() },
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { unreadCount, listNotifications, markRead, emit, emitMany, affectedBuyerIds } from '../lib/notifications';

beforeEach(() => vi.clearAllMocks());

describe('leitura', () => {
  it('unreadCount conta só não-lidas do usuário', async () => {
    mockDb.notification.count.mockResolvedValue(3);
    expect(await unreadCount('U')).toBe(3);
    expect(mockDb.notification.count).toHaveBeenCalledWith({ where: { userId: 'U', readAt: null } });
  });
  it('markRead sem ids marca todas as não-lidas', async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 2 });
    await markRead('U');
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'U', readAt: null } }));
  });
  it('markRead com ids restringe ao subconjunto', async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 1 });
    await markRead('U', ['n1', 'n2']);
    expect(mockDb.notification.updateMany.mock.calls[0][0].where.id).toEqual({ in: ['n1', 'n2'] });
  });
  it('listNotifications ordena por createdAt desc', async () => {
    mockDb.notification.findMany.mockResolvedValue([]);
    await listNotifications('U');
    expect(mockDb.notification.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('emissão (tx-aware)', () => {
  it('emit cria 1 notificação com refs normalizadas', async () => {
    const tx: any = { notification: { create: vi.fn() } };
    await emit(tx, { userId: 'U', type: 'request_accepted', listingId: 'L' });
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'U', type: 'request_accepted', listingId: 'L', requestId: null, dealId: null }) });
  });
  it('emitMany não chama createMany com lista vazia', async () => {
    const tx: any = { notification: { createMany: vi.fn() } };
    await emitMany(tx, []);
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it('affectedBuyerIds retorna ids distintos dos pedidos abertos', async () => {
    const tx: any = { request: { findMany: vi.fn().mockResolvedValue([{ buyerId: 'b1' }, { buyerId: 'b2' }]) } };
    expect(await affectedBuyerIds(tx, 'L', { excludeBuyerId: 'b9' })).toEqual(['b1', 'b2']);
    expect(tx.request.findMany.mock.calls[0][0].where.buyerId).toEqual({ not: 'b9' });
  });
});
