import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockRequireUser } = vi.hoisted(() => ({
  mockDb: {
    listing: { findFirst: vi.fn() },
    favorite: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
  mockRequireUser: vi.fn(),
}));

vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('../lib/session', () => ({
  requireUser: mockRequireUser,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import { POST } from '../app/api/listings/[id]/favorite/route';

const props = { params: Promise.resolve({ id: 'L' }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: 'B' });
  mockDb.favorite.upsert.mockResolvedValue({});
});

describe('POST /api/listings/[id]/favorite', () => {
  it('não favorita anúncio oculto, removido ou indisponível', async () => {
    mockDb.listing.findFirst.mockResolvedValue(null);

    const res = await POST(new Request('http://test.local'), props);

    expect(res.status).toBe(404);
    expect(mockDb.listing.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'L',
        status: 'active',
        deletedAt: null,
        category: { is: { active: true } },
      }),
    }));
    expect(mockDb.favorite.upsert).not.toHaveBeenCalled();
  });

  it('não favorita o próprio anúncio', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'B' });

    const res = await POST(new Request('http://test.local'), props);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toMatch(/próprio anúncio/i);
    expect(mockDb.favorite.upsert).not.toHaveBeenCalled();
  });

  it('favorita anúncio público de outro usuário', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'S' });

    const res = await POST(new Request('http://test.local'), props);

    expect(res.status).toBe(200);
    expect(mockDb.favorite.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_listingId: { userId: 'B', listingId: 'L' } },
      create: { userId: 'B', listingId: 'L' },
    }));
  });
});
