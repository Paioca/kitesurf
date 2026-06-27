import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    favorite: { findMany: vi.fn() },
    listing: { findMany: vi.fn(), count: vi.fn() },
    review: { findMany: vi.fn() },
  },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('../lib/session', () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));

import { getFavorites } from '../lib/browse';

const kitListing = (over: Record<string, unknown> = {}) => ({
  id: 'L',
  title: 'Kite + Barra',
  brand: { name: 'Duotone' },
  model: { name: 'Rebel' },
  year: 2023,
  price: 620000,
  hasBarra: true,
  kitePrice: 480000,
  barraPrice: 180000,
  attributes: { size_m2: 9, condition: 'semi_otimo' },
  barraAttributes: { line_length_m: 22, condition: 'bom', compatible_brand: 'North' },
  category: { slug: 'kite', namePt: 'Kite' },
  shippable: false,
  city: 'Cumbuco',
  kiteSoldAt: new Date('2026-06-01T00:00:00.000Z'),
  barraSoldAt: null,
  images: [{ component: 'barra', thumbUrl: '/barra.jpg', url: '/barra-full.jpg' }, { component: 'kite', thumbUrl: '/kite.jpg', url: '/kite-full.jpg' }],
  deals: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getFavorites', () => {
  it('N4 — kit favorito com kite vendido mostra a barra disponível, não o kite vendido', async () => {
    mockDb.favorite.findMany.mockResolvedValue([{ listing: kitListing() }]);
    const [card] = await getFavorites('B');
    expect(card.catSlug).toBe('barra');
    expect(card.brand).toBe('North');
    expect(card.model).toBe('Barra do kit');
    expect(card.priceCents).toBe(180000);
    expect(card.sizeLabel).toBe('linhas 22 m');
    expect(card.photo).toBe('/barra.jpg');
    expect(card.partOfKit).toBe(true);
    expect(card.includesBar).toBe(false);
  });

  it('kit favorito com kite reservado mostra a barra disponível', async () => {
    mockDb.favorite.findMany.mockResolvedValue([{
      listing: kitListing({
        kiteSoldAt: null,
        deals: [{ component: 'kite' }],
      }),
    }]);

    const [card] = await getFavorites('B');

    expect(card.catSlug).toBe('barra');
    expect(card.brand).toBe('North');
    expect(card.priceCents).toBe(180000);
    expect(card.partOfKit).toBe(true);
  });

  it('não mostra favorito quando todas as peças estão reservadas', async () => {
    mockDb.favorite.findMany.mockResolvedValue([{
      listing: kitListing({
        kiteSoldAt: null,
        deals: [{ component: 'conjunto' }],
      }),
    }]);

    await expect(getFavorites('B')).resolves.toEqual([]);
  });
});
