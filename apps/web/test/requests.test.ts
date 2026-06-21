import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    listing: { findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    request: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('../lib/notify', () => ({ notifyNewRequest: vi.fn().mockResolvedValue(undefined) }));

import { createRequest, setRequestStatus, cancelRequest } from '../lib/requests';
import { notifyNewRequest } from '../lib/notify';

beforeEach(() => vi.clearAllMocks());

describe('createRequest', () => {
  it('rejeita anúncio não-ativo', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', status: 'paused', userId: 'S', title: 't', user: { phone: '+55' } });
    await expect(createRequest('B', 'L', 'offer', 50000)).rejects.toThrow(/não está mais disponível/);
  });
  it('rejeita o dono ofertando no próprio anúncio', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', status: 'active', userId: 'B', title: 't', user: { phone: '+55' } });
    await expect(createRequest('B', 'L', 'offer', 50000)).rejects.toThrow(/dono/);
  });
  it('rejeita oferta sem valor mínimo', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', status: 'active', userId: 'S', title: 't', user: { phone: '+55' } });
    await expect(createRequest('B', 'L', 'offer', 50)).rejects.toThrow(/valor válido/);
  });
  it('cria e notifica no caminho feliz', async () => {
    mockDb.listing.findFirst.mockResolvedValue({ id: 'L', status: 'active', userId: 'S', title: 't', user: { phone: '+5599' } });
    mockDb.user.findUnique.mockResolvedValue({ name: 'Bruno', phone: '+5588' });
    mockDb.request.upsert.mockResolvedValue({ id: 'R', status: 'pending' });
    const r = await createRequest('B', 'L', 'offer', 150000);
    expect(r).toMatchObject({ id: 'R' });
    expect(notifyNewRequest).toHaveBeenCalledOnce();
  });
});

describe('setRequestStatus', () => {
  it('rejeita quem não é o vendedor', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'pending', listingId: 'L' });
    await expect(setRequestStatus('OUTRO', 'R', 'accepted')).rejects.toThrow(/permissão/i);
  });
  it('rejeita pedido já respondido (guard pending)', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'accepted', listingId: 'L' });
    await expect(setRequestStatus('S', 'R', 'accepted')).rejects.toThrow(/já foi respondido/);
  });
  it('rejeita aceitar em anúncio vendido', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'pending', listingId: 'L' });
    mockDb.listing.findUnique.mockResolvedValue({ status: 'sold', deletedAt: null });
    await expect(setRequestStatus('S', 'R', 'accepted')).rejects.toThrow(/vendido/);
  });
  it('aceita pedido pendente em anúncio ativo', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', sellerId: 'S', status: 'pending', listingId: 'L' });
    mockDb.listing.findUnique.mockResolvedValue({ status: 'active', deletedAt: null });
    mockDb.request.update.mockResolvedValue({});
    await expect(setRequestStatus('S', 'R', 'accepted')).resolves.toMatchObject({ ok: true, status: 'accepted' });
  });
});

describe('cancelRequest', () => {
  it('rejeita quem não é o comprador', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', buyerId: 'B', status: 'pending' });
    await expect(cancelRequest('OUTRO', 'R')).rejects.toThrow(/permissão/i);
  });
  it('rejeita cancelar um pedido já aceito', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', buyerId: 'B', status: 'accepted' });
    await expect(cancelRequest('B', 'R')).rejects.toThrow(/pendente/);
  });
  it('apaga o pedido pendente do próprio comprador', async () => {
    mockDb.request.findUnique.mockResolvedValue({ id: 'R', buyerId: 'B', status: 'pending' });
    mockDb.request.delete.mockResolvedValue({});
    await expect(cancelRequest('B', 'R')).resolves.toMatchObject({ ok: true });
    expect(mockDb.request.delete).toHaveBeenCalledWith({ where: { id: 'R' } });
  });
});
