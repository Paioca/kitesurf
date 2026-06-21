import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    deal: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    request: { findUnique: vi.fn(), updateMany: vi.fn() },
    listing: { findUnique: vi.fn(), updateMany: vi.fn() },
    review: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { confirmPurchase, cancelSale, createReview, confirmSaleFromRequest } from '../lib/deals';

beforeEach(() => {
  vi.clearAllMocks();
  // por padrão, $transaction executa o callback com o próprio mock como tx
  mockDb.$transaction.mockImplementation(async (fn: any) => fn(mockDb));
});

describe('confirmPurchase', () => {
  it('rejeita quem não é o comprador', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', buyerId: 'B', status: 'seller_confirmed', listingId: 'L' });
    await expect(confirmPurchase('OUTRO', 'D')).rejects.toThrow(/comprador/);
  });
  it('rejeita negócio fora de seller_confirmed', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', buyerId: 'B', status: 'completed', listingId: 'L' });
    await expect(confirmPurchase('B', 'D')).rejects.toThrow(/aguardando/);
  });
  it('aborta se o anúncio já não está disponível (updateMany.count===0)', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', buyerId: 'B', status: 'seller_confirmed', listingId: 'L' });
    mockDb.listing.updateMany.mockResolvedValue({ count: 0 });
    await expect(confirmPurchase('B', 'D')).rejects.toThrow(/já foi vendido/);
  });
  it('completa de forma atômica e recusa os outros pedidos', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', buyerId: 'B', status: 'seller_confirmed', listingId: 'L' });
    mockDb.listing.updateMany.mockResolvedValue({ count: 1 });
    mockDb.deal.update.mockResolvedValue({});
    mockDb.request.updateMany.mockResolvedValue({ count: 2 });
    await confirmPurchase('B', 'D');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }));
    expect(mockDb.request.updateMany).toHaveBeenCalledOnce(); // recusa os outros pedidos
  });
});

describe('cancelSale', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', sellerId: 'S', status: 'seller_confirmed' });
    await expect(cancelSale('OUTRO', 'D')).rejects.toThrow(/vendedor/);
  });
  it('rejeita cancelar um negócio já concluído', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', sellerId: 'S', status: 'completed' });
    await expect(cancelSale('S', 'D')).rejects.toThrow(/não concluída/);
  });
  it('cancela um negócio seller_confirmed do próprio vendedor', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', sellerId: 'S', status: 'seller_confirmed' });
    mockDb.deal.update.mockResolvedValue({});
    await cancelSale('S', 'D');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }));
  });
});

describe('createReview', () => {
  it('rejeita avaliar negócio cancelado', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', status: 'cancelled', buyerId: 'B', sellerId: 'S' });
    await expect(createReview('B', 'D', 5)).rejects.toThrow(/cancelado/);
  });
  it('rejeita quem não participa do negócio', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', status: 'completed', buyerId: 'B', sellerId: 'S' });
    await expect(createReview('OUTRO', 'D', 5)).rejects.toThrow(/acesso/i);
  });
  it('rejeita nota fora de 1-5', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', status: 'completed', buyerId: 'B', sellerId: 'S' });
    await expect(createReview('B', 'D', 6)).rejects.toThrow(/nota inválida/i);
  });
  it('grava review válida do participante', async () => {
    mockDb.deal.findUnique.mockResolvedValue({ id: 'D', status: 'completed', buyerId: 'B', sellerId: 'S' });
    mockDb.review.upsert.mockResolvedValue({});
    await createReview('B', 'D', 5, 'bom', ['Pontual']);
    expect(mockDb.review.upsert).toHaveBeenCalledOnce();
  });
});

describe('confirmSaleFromRequest', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'accepted', listingId: 'L', buyerId: 'B' });
    await expect(confirmSaleFromRequest('OUTRO', 'R')).rejects.toThrow(/vendedor/);
  });
  it('exige o pedido aceito antes de marcar vendido', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'pending', listingId: 'L', buyerId: 'B' });
    await expect(confirmSaleFromRequest('S', 'R')).rejects.toThrow(/[Aa]ceite o pedido/);
  });
});
