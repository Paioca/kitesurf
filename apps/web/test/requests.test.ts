import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    listing: { findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    request: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deal: { count: vi.fn(), findMany: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('../lib/notify', () => ({ notifyNewRequest: vi.fn().mockResolvedValue(undefined), notifyRequestAccepted: vi.fn().mockResolvedValue(undefined) }));

import { createRequest, setRequestStatus, cancelRequest, getListingRequestState, getRequestsForUser, waLink } from '../lib/requests';
import { notifyNewRequest, notifyRequestAccepted } from '../lib/notify';

// peça única (conjunto) por padrão; passar over pra virar kit
const listingMock = (over: Record<string, unknown> = {}) => ({
  id: 'L', userId: 'S', title: 't', user: { phone: '+5599' },
  status: 'active', hasBarra: false, price: 620000, kitePrice: null, barraPrice: null,
  kiteSoldAt: null, barraSoldAt: null, ...over,
});
const reqMock = (over: Record<string, unknown> = {}) => ({ id: 'R', sellerId: 'S', buyerId: 'B', status: 'pending', component: 'conjunto', listingId: 'L', ...over });
const requestListMock = (over: Record<string, unknown> = {}) => ({
  id: 'R', sellerId: 'S', buyerId: 'B', status: 'accepted', type: 'offer', amount: 150000, component: 'conjunto',
  listingId: 'L', createdAt: new Date('2026-06-01T12:00:00Z'),
  listing: { id: 'L', title: 'Kite X', price: 620000, status: 'active', images: [] },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.user.findUnique.mockResolvedValue({ name: 'Bruno', phone: '+5588' });
  mockDb.$transaction.mockImplementation(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockDb)));
  mockDb.notification.create.mockResolvedValue({});
  mockDb.listing.findUnique.mockResolvedValue({ title: 't' });
  mockDb.deal.findMany.mockResolvedValue([]); // §7 reserve-block: sem reservas ativas por padrão
});

describe('waLink', () => {
  it('gera link só para telefone real', () => {
    expect(waLink('+55 (88) 99999-0000')).toBe('https://wa.me/5588999990000');
    expect(waLink(null)).toBeNull();
    expect(waLink('deleted_user_123456789')).toBeNull();
    expect(waLink('abc')).toBeNull();
  });
});

describe('createRequest', () => {
  it('rejeita anúncio não-ativo', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ status: 'paused' }));
    await expect(createRequest('B', 'L', 'offer', 50000)).rejects.toThrow(/não está mais disponível/);
  });
  it('rejeita o dono ofertando no próprio anúncio', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ userId: 'B' }));
    await expect(createRequest('B', 'L', 'offer', 50000)).rejects.toThrow(/dono/);
  });
  it('rejeita oferta sem valor mínimo', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock());
    await expect(createRequest('B', 'L', 'offer', 50)).rejects.toThrow(/valor válido/);
  });
  it('rejeita oferta absurda (teto anti-erro de digitação)', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock());
    await expect(createRequest('B', 'L', 'offer', 620000 * 5)).rejects.toThrow(/muito acima/);
  });
  it('cria e notifica no caminho feliz', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock());
    mockDb.request.upsert.mockResolvedValue({ id: 'R', status: 'pending' });
    const r = await createRequest('B', 'L', 'offer', 150000);
    expect(r).toMatchObject({ id: 'R' });
    expect(notifyNewRequest).toHaveBeenCalledOnce();
  });
  it('rejeita ofertar numa peça já vendida do kit', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, barraSoldAt: new Date() }));
    await expect(createRequest('B', 'L', 'offer', 100000, 'barra')).rejects.toThrow(/não está mais disponível|já foi vendida/i);
  });
  it('valida amount contra o preço da PEÇA (barra), não do conjunto', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    // 180000*3 = 540000 → 600000 estoura o teto da barra (mas seria ok pro conjunto 620000*3)
    await expect(createRequest('B', 'L', 'offer', 600000, 'barra')).rejects.toThrow(/muito acima/);
  });
  it('aceita oferta na barra dentro do teto da peça', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    mockDb.request.upsert.mockResolvedValue({ id: 'R', status: 'pending' });
    await expect(createRequest('B', 'L', 'offer', 170000, 'barra')).resolves.toMatchObject({ id: 'R' });
  });
  // §7/§15 #4 — peça com venda aguardando confirmação (reserva) rejeita nova solicitação
  // no BACKEND (não só esconde). E #16: conjunto reservado bloqueia o kite.
  it('rejeita solicitação numa peça reservada (seller_confirmed) — back rejeita', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    mockDb.deal.findMany.mockResolvedValue([{ component: 'conjunto' }]); // venda do conjunto em andamento
    await expect(createRequest('B', 'L', 'offer', 170000, 'kite')).rejects.toThrow(/venda em andamento/i);
  });
  it('§15 #5 — kite reservado NÃO bloqueia oferta na barra do mesmo kit', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    mockDb.deal.findMany.mockResolvedValue([{ component: 'kite' }]); // só o kite reservado
    mockDb.request.upsert.mockResolvedValue({ id: 'R', status: 'pending' });
    await expect(createRequest('B', 'L', 'offer', 170000, 'barra')).resolves.toMatchObject({ id: 'R' });
  });
  // §12/§15 #13 — mesmo telefone (negociar com a própria conta) é rejeitado (oferta e visita).
  it('rejeita quando o telefone do comprador == do vendedor (oferta)', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ user: { phone: '+5588' } }));
    mockDb.user.findUnique.mockResolvedValue({ name: 'Bruno', phone: '+5588' });
    await expect(createRequest('B', 'L', 'offer', 150000)).rejects.toThrow(/própria conta/i);
  });
  it('rejeita quando o telefone do comprador == do vendedor (visita)', async () => {
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ user: { phone: '+5588' } }));
    mockDb.user.findUnique.mockResolvedValue({ name: 'Bruno', phone: '+5588' });
    await expect(createRequest('B', 'L', 'visit')).rejects.toThrow(/própria conta/i);
  });
});

describe('setRequestStatus', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock());
    await expect(setRequestStatus('OUTRO', 'R', 'accepted')).rejects.toThrow(/permissão/i);
  });
  it('rejeita pedido já respondido (guard pending)', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ status: 'accepted' }));
    await expect(setRequestStatus('S', 'R', 'accepted')).rejects.toThrow(/já foi respondido/);
  });
  it('rejeita aceitar com a peça já vendida', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ component: 'barra' }));
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, barraSoldAt: new Date() }));
    await expect(setRequestStatus('S', 'R', 'accepted')).rejects.toThrow(/já foi vendida/);
  });
  it('rejeita aceitar pedido antigo quando a peça está reservada em outra venda', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ component: 'kite' }));
    mockDb.listing.findFirst.mockResolvedValue(listingMock({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    mockDb.deal.findMany.mockResolvedValue([{ component: 'conjunto' }]);
    await expect(setRequestStatus('S', 'R', 'accepted')).rejects.toThrow(/venda em andamento/i);
    expect(mockDb.request.update).not.toHaveBeenCalled();
  });
  it('aceita pedido pendente com a peça disponível e manda SMS de interesse pro comprador', async () => {
    mockDb.request.findUnique
      .mockResolvedValueOnce(reqMock()) // r (guard inicial)
      .mockResolvedValueOnce({ buyer: { phone: '+5588999990000' }, seller: { phone: '+5599999990000' } }); // parties (pós-commit)
    mockDb.listing.findFirst.mockResolvedValue(listingMock());
    mockDb.listing.findUnique.mockResolvedValue({ title: 'Kite X' });
    mockDb.request.update.mockResolvedValue({});
    // §8/§15 #1 — aceite devolve o link do WhatsApp do COMPRADOR (front navega na mesma aba).
    await expect(setRequestStatus('S', 'R', 'accepted')).resolves.toMatchObject({ ok: true, status: 'accepted', whatsapp: 'https://wa.me/5588999990000' });
    expect(notifyRequestAccepted).toHaveBeenCalledWith(expect.objectContaining({ buyerPhone: '+5588999990000', sellerPhone: '+5599999990000' }));
  });
  // §15 #2 — recusar não compartilha contato (sem SMS, sem link de WhatsApp).
  it('recusar NÃO manda SMS de interesse nem devolve WhatsApp', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock());
    mockDb.listing.findUnique.mockResolvedValue({ title: 'Kite X' });
    mockDb.request.update.mockResolvedValue({});
    await expect(setRequestStatus('S', 'R', 'declined')).resolves.toMatchObject({ status: 'declined', whatsapp: null });
    expect(notifyRequestAccepted).not.toHaveBeenCalled();
  });
});

describe('cancelRequest', () => {
  it('rejeita quem não é o comprador', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock());
    await expect(cancelRequest('OUTRO', 'R')).rejects.toThrow(/permissão/i);
  });
  it('desiste de um pedido pendente → withdrawn (não apaga)', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock());
    mockDb.request.update.mockResolvedValue({});
    await expect(cancelRequest('B', 'R')).resolves.toMatchObject({ ok: true, contactAlreadyShared: false });
    expect(mockDb.request.update).toHaveBeenCalledWith({ where: { id: 'R' }, data: { status: 'withdrawn' } });
    expect(mockDb.request.delete).not.toHaveBeenCalled();
  });
  it('desiste de um pedido aceito (contato já compartilhado, sem venda marcada)', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ status: 'accepted' }));
    mockDb.deal.count.mockResolvedValue(0);
    mockDb.request.update.mockResolvedValue({});
    await expect(cancelRequest('B', 'R')).resolves.toMatchObject({ ok: true, contactAlreadyShared: true });
  });
  it('bloqueia desistência quando o vendedor já marcou vendido (use "não comprei")', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ status: 'accepted' }));
    mockDb.deal.count.mockResolvedValue(1);
    await expect(cancelRequest('B', 'R')).rejects.toThrow(/[Nn]ão comprei/);
  });
  it('rejeita retirar um pedido em estado terminal (ex: declined)', async () => {
    mockDb.request.findUnique.mockResolvedValue(reqMock({ status: 'declined' }));
    await expect(cancelRequest('B', 'R')).rejects.toThrow(/não pode mais ser retirado/);
  });
});

describe('getRequestsForUser', () => {
  it('oculta WhatsApp de pedido aceito quando o negócio está em disputa', async () => {
    mockDb.request.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([requestListMock({ seller: { name: 'Sofia', avatarUrl: null, phone: '+5599999990000' } })]);
    mockDb.deal.findMany.mockResolvedValue([{
      id: 'D', listingId: 'L', buyerId: 'B', sellerId: 'S', component: 'conjunto', status: 'disputed',
      reviews: [], disputes: [{ openedByUserId: 'B', reason: 'engano' }],
    }]);

    const state = await getRequestsForUser('B');

    expect(state.outgoing[0].status).toBe('accepted');
    expect(state.outgoing[0].deal?.status).toBe('disputed');
    expect(state.outgoing[0].whatsapp).toBeNull();
  });

  it('mantém WhatsApp em pedido aceito sem disputa ativa', async () => {
    mockDb.request.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([requestListMock({ seller: { name: 'Sofia', avatarUrl: null, phone: '+5599999990000' } })]);
    mockDb.deal.findMany.mockResolvedValue([]);

    await expect(getRequestsForUser('B')).resolves.toMatchObject({
      outgoing: [expect.objectContaining({ whatsapp: 'https://wa.me/5599999990000' })],
    });
  });
});

describe('getListingRequestState', () => {
  it('oculta WhatsApp no detalhe do anúncio quando o negócio está em disputa', async () => {
    mockDb.request.findMany.mockResolvedValue([
      { ...reqMock({ status: 'accepted', type: 'offer', amount: 150000 }), seller: { phone: '+5599' } },
    ]);
    mockDb.deal.findMany.mockResolvedValue([
      { listingId: 'L', buyerId: 'B', sellerId: 'S', component: 'conjunto', status: 'disputed' },
    ]);

    await expect(getListingRequestState('B', 'L')).resolves.toMatchObject({
      conjunto: { whatsapp: null, offer: { id: 'R', status: 'accepted', amount: 150000 } },
    });
  });

  it('inclui id da visita para permitir cancelar no detalhe do anúncio', async () => {
    mockDb.request.findMany.mockResolvedValue([
      { ...reqMock({ id: 'VISIT1', status: 'pending', type: 'visit', amount: null }), seller: { phone: '+5599999990000' } },
    ]);
    mockDb.deal.findMany.mockResolvedValue([]);

    await expect(getListingRequestState('B', 'L')).resolves.toMatchObject({
      conjunto: { visit: { id: 'VISIT1', status: 'pending' }, whatsapp: null },
    });
  });
});
