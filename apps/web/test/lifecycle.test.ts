import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    listing: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    deal: { count: vi.fn() },
    request: { updateMany: vi.fn(), findMany: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { removeListing, deleteAccount } from '../lib/lifecycle';

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockDb)));
  mockDb.request.updateMany.mockResolvedValue({ count: 0 });
  mockDb.request.findMany.mockResolvedValue([]);
  mockDb.listing.update.mockResolvedValue({});
  mockDb.listing.updateMany.mockResolvedValue({ count: 0 });
  mockDb.user.update.mockResolvedValue({});
  mockDb.user.findUnique.mockResolvedValue({ name: 'Old', email: 'old@x.com', phone: '+5511', emailVerified: true, phoneVerified: true, status: 'active' });
  mockDb.notification.createMany.mockResolvedValue({ count: 0 });
  mockDb.auditEvent.create.mockResolvedValue({});
});

describe('removeListing', () => {
  it('rejeita quem não é o dono', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'OUTRO' });
    await expect(removeListing('S', 'L')).rejects.toThrow(/permissão/i);
  });
  it('bloqueia exclusão com venda aguardando confirmação', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'S' });
    mockDb.deal.count.mockResolvedValue(1);
    await expect(removeListing('S', 'L')).rejects.toThrow(/aguardando confirmação/);
    expect(mockDb.listing.update).not.toHaveBeenCalled();
  });
  it('sem deal aberto: encerra pedidos como listing_removed e faz soft-delete', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'S' });
    mockDb.deal.count.mockResolvedValue(0);
    await removeListing('S', 'L');
    expect(mockDb.request.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'listing_removed' } }));
    expect(mockDb.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'archived' }) }));
  });
  // §10/§15 #10 — anúncio vendido é imutável: o dono não exclui (back bloqueia).
  it('bloqueia exclusão de anúncio vendido (Listing.sold)', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'S', status: 'sold' });
    mockDb.deal.count.mockResolvedValue(0); // sem venda aguardando confirmação
    await expect(removeListing('S', 'L')).rejects.toThrow(/registra uma venda|não pode ser excluído/i);
    expect(mockDb.listing.update).not.toHaveBeenCalled();
  });
  it('bloqueia exclusão quando há Deal histórico (listingHasSaleRecord)', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', userId: 'S', status: 'active' });
    // 1ª contagem = openDeal (seller_confirmed) = 0; 2ª = listingHasSaleRecord = 1
    mockDb.deal.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    await expect(removeListing('S', 'L')).rejects.toThrow(/registra uma venda|não pode ser excluído/i);
    expect(mockDb.listing.update).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  it('bloqueia exclusão com venda aguardando confirmação (qualquer lado)', async () => {
    mockDb.deal.count.mockResolvedValue(1);
    await expect(deleteAccount('U')).rejects.toThrow(/aguardando confirmação/);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
  it('encerra pedidos e anonimiza quando não há venda aberta', async () => {
    mockDb.deal.count.mockResolvedValue(0);
    await deleteAccount('U');
    // comprador → withdrawn; vendedor → listing_removed
    const statuses = mockDb.request.updateMany.mock.calls.map((c: any) => c[0].data.status);
    expect(statuses).toContain('withdrawn');
    expect(statuses).toContain('listing_removed');
    expect(mockDb.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Conta removida', status: 'blocked' }) }));
  });
});
