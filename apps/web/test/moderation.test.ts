import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    listing: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    request: { findMany: vi.fn(), updateMany: vi.fn() },
    notification: { createMany: vi.fn() },
    moderationAction: { create: vi.fn() },
    report: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { moderate } from '../lib/moderation';

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (arg: any) => arg(mockDb));
  mockDb.user.findUnique.mockResolvedValue({ id: 'S', admin: false });
  mockDb.user.update.mockResolvedValue({});
  mockDb.listing.findMany.mockResolvedValue([{ id: 'L1', title: 'Kite X' }, { id: 'L2', title: 'Barra Y' }]);
  mockDb.request.findMany.mockResolvedValue([{ buyerId: 'B1', listingId: 'L1' }, { buyerId: 'B2', listingId: 'L2' }]);
  mockDb.request.updateMany.mockResolvedValue({ count: 2 });
  mockDb.listing.updateMany.mockResolvedValue({ count: 2 });
  mockDb.notification.createMany.mockResolvedValue({ count: 2 });
  mockDb.moderationAction.create.mockResolvedValue({});
});

describe('moderate', () => {
  it('N3 — suspender usuário arquiva vitrine e revoga pedidos abertos do vendedor', async () => {
    await moderate('ADM', { action: 'suspend_user', targetId: 'S' });
    expect(mockDb.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'S' },
      data: expect.objectContaining({ status: 'blocked', sessionVersion: { increment: 1 } }),
    }));
    expect(mockDb.request.updateMany).toHaveBeenCalledWith({
      where: { sellerId: 'S', status: { in: ['pending', 'accepted'] } },
      data: { status: 'listing_removed' },
    });
    expect(mockDb.listing.updateMany).toHaveBeenCalledWith({
      where: { userId: 'S', deletedAt: null, status: { in: ['active', 'paused'] } },
      data: { status: 'archived' },
    });
    expect(mockDb.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 'B1', type: 'listing_removed', listingId: 'L1', data: { title: 'Kite X' } }),
      ]),
    }));
  });

  it('não suspende admin', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'ADM2', admin: true });
    await expect(moderate('ADM', { action: 'suspend_user', targetId: 'ADM2' })).rejects.toThrow(/admin/i);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});
