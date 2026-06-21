import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    deal: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    request: { findUnique: vi.fn(), updateMany: vi.fn() },
    listing: { findFirst: vi.fn(), updateMany: vi.fn() },
    review: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { confirmPurchase, cancelSale, createReview, confirmSaleFromRequest } from '../lib/deals';

const dealMock = (over: Record<string, unknown> = {}) => ({ id: 'D', listingId: 'L', sellerId: 'S', buyerId: 'B', status: 'seller_confirmed', component: 'conjunto', ...over });
const listingMock = (over: Record<string, unknown> = {}) => ({ status: 'active', hasBarra: false, price: 620000, kitePrice: null, barraPrice: null, kiteSoldAt: null, barraSoldAt: null, ...over });
const kit = (over: Record<string, unknown> = {}) => listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (fn: any) => fn(mockDb));
  mockDb.listing.updateMany.mockResolvedValue({ count: 1 });
  mockDb.deal.update.mockResolvedValue({});
  mockDb.request.updateMany.mockResolvedValue({ count: 0 });
});

describe('confirmPurchase', () => {
  it('rejeita quem não é o comprador', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ buyerId: 'B' }));
    await expect(confirmPurchase('OUTRO', 'D')).rejects.toThrow(/comprador/);
  });
  it('rejeita negócio fora de seller_confirmed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(confirmPurchase('B', 'D')).rejects.toThrow(/aguardando/);
  });
  it('aborta se a peça já vendeu (updateMany.count===0)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    mockDb.listing.findFirst.mockResolvedValue(listingMock());
    mockDb.listing.updateMany.mockResolvedValue({ count: 0 });
    await expect(confirmPurchase('B', 'D')).rejects.toThrow(/já foi vendida/);
  });
  it('vender o conjunto fecha o anúncio e recusa todos os outros', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ component: 'conjunto' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    await confirmPurchase('B', 'D');
    expect(mockDb.listing.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sold' }) }));
    // recusa sem filtro de componente (fechou tudo)
    expect(mockDb.request.updateMany.mock.calls[0][0].where.component).toBeUndefined();
  });
  it('vender a barra NÃO fecha o kit; seta barraSoldAt; recusa só barra+conjunto', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ component: 'barra' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    await confirmPurchase('B', 'D');
    const lu = mockDb.listing.updateMany.mock.calls[0][0];
    expect(lu.data.barraSoldAt).toBeInstanceOf(Date);
    expect(lu.data.status).toBeUndefined(); // não fecha
    expect(mockDb.request.updateMany.mock.calls[0][0].where.component).toEqual({ in: ['conjunto', 'barra'] });
  });
  it('regra órfã: vender o kite de um kit sem barraPrice → fecha o anúncio', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ component: 'kite' }));
    mockDb.listing.findFirst.mockResolvedValue(kit({ barraPrice: null }));
    await confirmPurchase('B', 'D');
    expect(mockDb.listing.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sold', kiteSoldAt: expect.any(Date) }) }));
  });
});

describe('cancelSale', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    await expect(cancelSale('OUTRO', 'D')).rejects.toThrow(/vendedor/);
  });
  it('rejeita cancelar um negócio já concluído', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(cancelSale('S', 'D')).rejects.toThrow(/não concluída/);
  });
  it('cancela um seller_confirmed do próprio vendedor (não toca em *SoldAt)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    mockDb.deal.update.mockResolvedValue({});
    await cancelSale('S', 'D');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }));
  });
});

describe('createReview', () => {
  it('rejeita avaliar negócio cancelado', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'cancelled' }));
    await expect(createReview('B', 'D', 5)).rejects.toThrow(/cancelado/);
  });
  it('rejeita quem não participa', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(createReview('OUTRO', 'D', 5)).rejects.toThrow(/acesso/i);
  });
  it('rejeita nota fora de 1-5', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(createReview('B', 'D', 6)).rejects.toThrow(/nota inválida/i);
  });
  it('grava review válida do participante', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    mockDb.review.upsert.mockResolvedValue({});
    await createReview('B', 'D', 5, 'bom', ['Pontual']);
    expect(mockDb.review.upsert).toHaveBeenCalledOnce();
  });
});

describe('confirmSaleFromRequest', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'accepted', listingId: 'L', buyerId: 'B', component: 'conjunto' });
    await expect(confirmSaleFromRequest('OUTRO', 'R')).rejects.toThrow(/vendedor/);
  });
  it('exige o pedido aceito antes de marcar vendido', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'pending', listingId: 'L', buyerId: 'B', component: 'conjunto' });
    await expect(confirmSaleFromRequest('S', 'R')).rejects.toThrow(/[Aa]ceite o pedido/);
  });
});
