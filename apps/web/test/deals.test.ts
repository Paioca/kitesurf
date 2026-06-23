import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    deal: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    request: { findUnique: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    listing: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    review: { upsert: vi.fn() },
    dealDispute: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));

import {
  confirmPurchase, cancelSale, createReview, confirmSaleFromRequest, openNegotiationExists, denyPurchase,
  requestReversal, respondReversal, cancelReversal, resolveDispute, correctUnconfirmed, closeUnconfirmedExpired,
  listingHasSaleRecord, COUNTS_AS_SALE_STATUSES, SOLD_RECORD_DEAL_STATUSES,
} from '../lib/deals';

const dealMock = (over: Record<string, unknown> = {}) => ({ id: 'D', listingId: 'L', sellerId: 'S', buyerId: 'B', status: 'seller_confirmed', component: 'conjunto', ...over });
const listingMock = (over: Record<string, unknown> = {}) => ({ status: 'active', hasBarra: false, price: 620000, kitePrice: null, barraPrice: null, kiteSoldAt: null, barraSoldAt: null, ...over });
const kit = (over: Record<string, unknown> = {}) => listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockDb)));
  mockDb.$queryRaw.mockResolvedValue([]); // lock FOR UPDATE — no-op no mock
  mockDb.listing.updateMany.mockResolvedValue({ count: 1 });
  mockDb.listing.findUnique.mockResolvedValue({ title: 't', status: 'sold' });
  mockDb.listing.update.mockResolvedValue({});
  mockDb.deal.update.mockResolvedValue({});
  mockDb.deal.updateMany.mockResolvedValue({ count: 0 });
  mockDb.deal.findMany.mockResolvedValue([]);
  mockDb.request.updateMany.mockResolvedValue({ count: 0 });
  mockDb.request.findMany.mockResolvedValue([]);
  mockDb.dealDispute.create.mockResolvedValue({ id: 'DISP' });
  mockDb.dealDispute.update.mockResolvedValue({});
  mockDb.notification.create.mockResolvedValue({});
  mockDb.notification.createMany.mockResolvedValue({ count: 0 });
  mockDb.auditEvent.create.mockResolvedValue({});
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
  // §15 #15 — cancelar a venda NOTIFICA o comprador (antes não emitia).
  it('notifica o comprador ao cancelar (sale_cancelled)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock());
    await cancelSale('S', 'D');
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'B', type: 'sale_cancelled' }) }));
  });
});

describe('createReview', () => {
  // §4/§15 #7 — avaliação SÓ depois de completed; rejeita todos os demais estados.
  it.each(['seller_confirmed', 'cancelled', 'voided', 'closed_unconfirmed', 'reversal_requested', 'reversed', 'disputed'])(
    'rejeita avaliar em %s (só completed libera)',
    async (status) => {
      mockDb.deal.findUnique.mockResolvedValue(dealMock({ status }));
      await expect(createReview('B', 'D', 5)).rejects.toThrow(/confirmada pelos dois/i);
    },
  );
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

// §3/§15 #14/#16 — trava por unidade física na marcação da venda (lock + matriz).
describe('confirmSaleFromRequest — reserva por unidade física', () => {
  const acceptedReq = (over: Record<string, unknown> = {}) => ({ id: 'R', sellerId: 'S', buyerId: 'B', status: 'accepted', listingId: 'L', component: 'kite', ...over });
  it('rejeita marcar venda com reserva conflitante (conjunto reservado bloqueia kite)', async () => {
    mockDb.request.findUnique.mockResolvedValue(acceptedReq({ component: 'kite' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    mockDb.deal.findFirst.mockResolvedValue(null);
    mockDb.deal.findMany.mockResolvedValue([{ id: 'OTHER', component: 'conjunto', buyerId: 'X' }]);
    await expect(confirmSaleFromRequest('S', 'R')).rejects.toThrow(/aguardando confirmação/i);
    expect(mockDb.deal.create).not.toHaveBeenCalled();
  });
  it('§15 #5/#16 — kite reservado NÃO bloqueia marcar a barra: cria com deadline 72h', async () => {
    mockDb.request.findUnique.mockResolvedValue(acceptedReq({ component: 'barra' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    mockDb.deal.findFirst.mockResolvedValue(null);
    mockDb.deal.findMany.mockResolvedValue([{ id: 'K', component: 'kite', buyerId: 'X' }]);
    mockDb.deal.create.mockResolvedValue({ id: 'D2' });
    await expect(confirmSaleFromRequest('S', 'R')).resolves.toBe('D2');
    expect(mockDb.deal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'seller_confirmed', confirmationDeadlineAt: expect.any(Date) }) }));
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'sale_marked' }) }));
  });
});

// §11 — reversão bilateral.
describe('requestReversal', () => {
  it('rejeita correção de venda não-completed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'seller_confirmed' }));
    await expect(requestReversal('B', 'D', 'engano')).rejects.toThrow(/confirmada pelos dois/i);
  });
  it('completed → reversal_requested + DealDispute(open) + notifica a contraparte', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await requestReversal('B', 'D', 'engano', 'troquei de ideia');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'reversal_requested' }) }));
    expect(mockDb.dealDispute.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ openedByUserId: 'B', counterpartyId: 'S', reason: 'engano', status: 'open' }) }));
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'S', type: 'reversal_requested' }) }));
  });
});

describe('respondReversal (§15 #11/#12)', () => {
  const reqReversal = (over: Record<string, unknown> = {}) => dealMock({ status: 'reversal_requested', disputes: [{ id: 'DISP', openedByUserId: 'B', counterpartyId: 'S' }], ...over });
  it('só a contraparte responde (quem pediu não pode)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(reqReversal());
    await expect(respondReversal('B', 'D', true)).rejects.toThrow(/outra parte/i);
  });
  it('aceitar → reversed + peça volta a paused + dispute resolved_reversed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(reqReversal());
    await respondReversal('S', 'D', true);
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'reversed' }) }));
    expect(mockDb.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }));
    expect(mockDb.dealDispute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'resolved_reversed' }) }));
  });
  it('recusar → disputed + dispute under_review (vai pra moderação)', async () => {
    mockDb.deal.findUnique.mockResolvedValue(reqReversal());
    await respondReversal('S', 'D', false);
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'disputed' }) }));
    expect(mockDb.dealDispute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'under_review' }) }));
  });
});

describe('cancelReversal', () => {
  const reqReversal = (over: Record<string, unknown> = {}) => dealMock({ status: 'reversal_requested', disputes: [{ id: 'DISP', openedByUserId: 'B', counterpartyId: 'S' }], ...over });
  it('só quem pediu pode desistir', async () => {
    mockDb.deal.findUnique.mockResolvedValue(reqReversal());
    await expect(cancelReversal('S', 'D')).rejects.toThrow(/quem pediu/i);
  });
  it('desistir → volta a completed + dispute closed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(reqReversal());
    await cancelReversal('B', 'D');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }));
    expect(mockDb.dealDispute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'closed' }) }));
  });
});

describe('resolveDispute — admin (§11)', () => {
  const disp = (over: Record<string, unknown> = {}) => ({ id: 'DISP', status: 'under_review', openedByUserId: 'B', counterpartyId: 'S', deal: { id: 'D', listingId: 'L', component: 'conjunto', status: 'disputed' }, ...over });
  it('rejeita disputa fora de under_review', async () => {
    mockDb.dealDispute.findUnique.mockResolvedValue(disp({ status: 'open' }));
    await expect(resolveDispute('ADM', 'DISP', 'uphold')).rejects.toThrow(/em análise/i);
  });
  it('uphold → Deal volta a completed; dispute resolved_upheld', async () => {
    mockDb.dealDispute.findUnique.mockResolvedValue(disp());
    await resolveDispute('ADM', 'DISP', 'uphold', 'sem evidência de devolução');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }));
    expect(mockDb.dealDispute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'resolved_upheld', resolvedByAdminId: 'ADM' }) }));
  });
  it('reverse → Deal reversed + peça paused; dispute resolved_reversed', async () => {
    mockDb.dealDispute.findUnique.mockResolvedValue(disp());
    await resolveDispute('ADM', 'DISP', 'reverse');
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'reversed' }) }));
    expect(mockDb.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }));
    expect(mockDb.dealDispute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'resolved_reversed' }) }));
  });
});

describe('correctUnconfirmed (§9)', () => {
  it('rejeita se o negócio não está closed_unconfirmed', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'completed' }));
    await expect(correctUnconfirmed('S', 'D')).rejects.toThrow(/não está encerrado/i);
  });
  it('vendedor corrige → peça volta a paused + deal cancelled', async () => {
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'closed_unconfirmed' }));
    await correctUnconfirmed('S', 'D');
    expect(mockDb.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }));
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) }));
  });
});

// §9/§15 #8/#18 — cron de encerramento em 72h.
describe('closeUnconfirmedExpired', () => {
  it('sem vencidos → 0 (nada a fazer)', async () => {
    mockDb.deal.findMany.mockResolvedValue([]);
    expect(await closeUnconfirmedExpired()).toBe(0);
  });
  it('encerra um seller_confirmed vencido → closed_unconfirmed + notifica o comprador', async () => {
    mockDb.deal.findMany.mockResolvedValue([{ id: 'D' }]);
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'seller_confirmed' }));
    mockDb.listing.findFirst.mockResolvedValue(kit());
    expect(await closeUnconfirmedExpired()).toBe(1);
    expect(mockDb.deal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'closed_unconfirmed' }) }));
    expect(mockDb.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'sale_closed_unconfirmed' }) }));
  });
  it('§15 #18 idempotente: deal já não-seller_confirmed dentro da tx → não reprocessa (0)', async () => {
    mockDb.deal.findMany.mockResolvedValue([{ id: 'D' }]);
    mockDb.deal.findUnique.mockResolvedValue(dealMock({ status: 'closed_unconfirmed' }));
    expect(await closeUnconfirmedExpired()).toBe(0);
    expect(mockDb.deal.update).not.toHaveBeenCalled();
  });
});

// §4/§10/§15 #8/#10/#17 — predicados de estado (constantes puras + listingHasSaleRecord).
describe('predicados de estado do Deal', () => {
  it('listingHasSaleRecord reflete a contagem', async () => {
    mockDb.deal.count.mockResolvedValue(1);
    expect(await listingHasSaleRecord('L')).toBe(true);
    mockDb.deal.count.mockResolvedValue(0);
    expect(await listingHasSaleRecord('L')).toBe(false);
  });
  it('#10 — SOLD_RECORD: completed + closed_unconfirmed + reversal_requested + disputed + reversed', () => {
    expect([...SOLD_RECORD_DEAL_STATUSES].sort()).toEqual(['closed_unconfirmed', 'completed', 'disputed', 'reversal_requested', 'reversed']);
  });
  it('#8/#17 — conta como venda: completed/reversal_requested/disputed; NÃO reversed nem closed_unconfirmed', () => {
    expect(COUNTS_AS_SALE_STATUSES).toEqual(['completed', 'reversal_requested', 'disputed']);
    expect(COUNTS_AS_SALE_STATUSES).not.toContain('reversed');
    expect(COUNTS_AS_SALE_STATUSES).not.toContain('closed_unconfirmed');
  });
});
