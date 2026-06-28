import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    notification: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), findFirst: vi.fn() },
    request: { findMany: vi.fn() },
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { unreadCount, listNotifications, listUnreadNotifications, markRead, emit, emitMany, affectedBuyerIds, favoriterIds } from '../lib/notifications';

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
  it('listUnreadNotifications lista só não-lidas', async () => {
    mockDb.notification.findMany.mockResolvedValue([]);
    await listUnreadNotifications('U', 6);
    expect(mockDb.notification.findMany).toHaveBeenCalledWith({ where: { userId: 'U', readAt: null }, orderBy: { createdAt: 'desc' }, take: 6 });
  });
});

describe('emissão (tx-aware)', () => {
  it('emit cria 1 notificação com refs normalizadas', async () => {
    const tx: any = { notification: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) } };
    await emit(tx, { userId: 'U', type: 'request_accepted', listingId: 'L' });
    expect(tx.notification.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ userId: 'U', type: 'request_accepted', listingId: 'L', requestId: null, dealId: null }), select: { id: true } });
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'U', type: 'request_accepted', listingId: 'L', requestId: null, dealId: null }) });
  });
  it('emit ignora notificação duplicada', async () => {
    const tx: any = { notification: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue({ id: 'N' }) } };
    await emit(tx, { userId: 'U', type: 'request_accepted', listingId: 'L' });
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
  it('emitMany não chama create com lista vazia', async () => {
    const tx: any = { notification: { create: vi.fn(), findFirst: vi.fn() } };
    await emitMany(tx, []);
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
  it('affectedBuyerIds retorna ids distintos dos pedidos abertos', async () => {
    const tx: any = { request: { findMany: vi.fn().mockResolvedValue([{ buyerId: 'b1' }, { buyerId: 'b2' }]) } };
    expect(await affectedBuyerIds(tx, 'L', { excludeBuyerId: 'b9' })).toEqual(['b1', 'b2']);
    expect(tx.request.findMany.mock.calls[0][0].where.buyerId).toEqual({ not: 'b9' });
  });
  it('favoriterIds retorna favoritantes distintos, excluindo os já notificados', async () => {
    const tx: any = { favorite: { findMany: vi.fn().mockResolvedValue([{ userId: 'f1' }, { userId: 'f2' }]) } };
    expect(await favoriterIds(tx, 'L', ['f0'])).toEqual(['f1', 'f2']);
    expect(tx.favorite.findMany.mock.calls[0][0].where.userId).toEqual({ notIn: ['f0'] });
  });
});
