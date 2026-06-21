import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    deal: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    request: { findUnique: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    listing: { findFirst: vi.fn(), updateMany: vi.fn() },
    review: { upsert: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import { confirmPurchase, cancelSale, createReview, confirmSaleFromRequest, openNegotiationExists, denyPurchase } from '../lib/deals';

const dealMock = (over: Record<string, unknown> = {}) => ({ id: 'D', listingId: 'L', sellerId: 'S', buyerId: 'B', status: 'seller_confirmed', component: 'conjunto', ...over });
const listingMock = (over: Record<string, unknown> = {}) => ({ status: 'active', hasBarra: false, price: 620000, kitePrice: null, barraPrice: null, kiteSoldAt: null, barraSoldAt: null, ...over });
const kit = (over: Record<string, unknown> = {}) => listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockDb)));
  mockDb.listing.updateMany.mockResolvedValue({ count: 1 });
  mockDb.deal.update.mockResolvedValue({});
  mockDb.deal.updateMany.mockResolvedValue({ count: 0 });
  mockDb.request.updateMany.mockResolvedValue({ count: 0 });
  mockDb.request.findMany.mockResolvedValue([]);
  mockDb.notification.create.mockResolvedValue({});
  mockDb.notification.createMany.mockResolvedValue({ count: 0 });
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
  it('vender o conjunto fecha o anúncio e encerra todos os outros', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ component: 'conjunto' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    await confirmPurchase('B', 'D');
    expect(mockDb.listing.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sold' }) }));
    // encerra sem filtro de componente (fechou tudo) e como sold_elsewhere (não declined)
    const ru = mockDb.request.updateMany.mock.calls[0][0];
    expect(ru.where.component).toBeUndefined();
    expect(ru.data.status).toBe('sold_elsewhere');
    // notifica o vendedor que a compra foi confirmada
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'purchase_confirmed' }) }));
  });
  it('invalida Deals seller_confirmed concorrentes ao concluir (voided)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ component: 'conjunto' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    await confirmPurchase('B', 'D');
    const du = mockDb.deal.updateMany.mock.calls[0][0];
    expect(du.where).toEqual(expect.objectContaining({ status: 'seller_confirmed', id: { not: 'D' }, buyerId: { not: 'B' } }));
    expect(du.data.status).toBe('voided');
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

describe('denyPurchase', () => {
  it('rejeita quem não é o comprador', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    await expect(denyPurchase('OUTRO', 'D')).rejects.toThrow(/comprador/);
  });
  it('rejeita negócio fora de seller_confirmed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(denyPurchase('B', 'D')).rejects.toThrow(/aguardando/);
  });
  it('cancela o deal e encerra o pedido, sem marcar o anúncio vendido', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    mockDb.deal.update.mockResolvedValue({});
    await denyPurchase('B', 'D');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }));
    expect(mockDb.request.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'withdrawn' } }));
    expect(mockDb.listing.updateMany).not.toHaveBeenCalled();
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'purchase_denied' }) }));
  });
});

describe('openNegotiationExists', () => {
  it('true quando há pedido aceito', async () => {
    mockDb.request.count.mockResolvedValue(1);
    mockDb.deal.count.mockResolvedValue(0);
    expect(await openNegotiationExists('L', 'kite')).toBe(true);
  });
  it('true quando há deal seller_confirmed', async () => {
    mockDb.request.count.mockResolvedValue(0);
    mockDb.deal.count.mockResolvedValue(1);
    expect(await openNegotiationExists('L', 'barra')).toBe(true);
  });
  it('false quando não há nenhum dos dois', async () => {
    mockDb.request.count.mockResolvedValue(0);
    mockDb.deal.count.mockResolvedValue(0);
    expect(await openNegotiationExists('L', 'conjunto')).toBe(false);
  });
});
