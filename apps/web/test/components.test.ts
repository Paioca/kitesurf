import { describe, it, expect } from 'vitest';
import { sellables, shouldCloseListing, priceOf, type ListingLike } from '../lib/components';

const L = (over: Partial<ListingLike> = {}): ListingLike => ({
  status: 'active', hasBarra: false, price: 620000, kitePrice: null, barraPrice: null,
  kiteSoldAt: null, barraSoldAt: null, ...over,
});

describe('sellables', () => {
  it('peça única ativa → só conjunto, disponível', () => {
    expect(sellables(L())).toEqual([{ component: 'conjunto', price: 620000, available: true }]);
  });
  it('peça única vendida → conjunto indisponível', () => {
    expect(sellables(L({ status: 'sold' }))[0].available).toBe(false);
  });
  it('kit com kite+barra avulsos → 3 alvos disponíveis', () => {
    const s = sellables(L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }));
    expect(s.map((x) => x.component)).toEqual(['conjunto', 'kite', 'barra']);
    expect(s.every((x) => x.available)).toBe(true);
  });
  it('kit com barra vendida → kite à venda, conjunto e barra não', () => {
    const s = sellables(L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, barraSoldAt: new Date() }));
    const by = Object.fromEntries(s.map((x) => [x.component, x.available]));
    expect(by).toEqual({ conjunto: false, kite: true, barra: false });
  });
  it('kit sold → tudo indisponível', () => {
    const s = sellables(L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, status: 'sold' }));
    expect(s.some((x) => x.available)).toBe(false);
  });
  it('kit sem preço avulso → só conjunto', () => {
    expect(sellables(L({ hasBarra: true })).map((x) => x.component)).toEqual(['conjunto']);
  });
});

describe('shouldCloseListing', () => {
  it('vender o conjunto fecha tudo', () => {
    expect(shouldCloseListing(L({ hasBarra: true, kitePrice: 1, barraPrice: 1 }), 'conjunto')).toBe(true);
  });
  it('peça única → vender fecha', () => {
    expect(shouldCloseListing(L(), 'conjunto')).toBe(true);
  });
  it('vender a barra com kite ainda à venda → NÃO fecha', () => {
    expect(shouldCloseListing(L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 }), 'barra')).toBe(false);
  });
  it('vender a 2ª peça (kite já vendido) → fecha', () => {
    expect(shouldCloseListing(L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000, kiteSoldAt: new Date() }), 'barra')).toBe(true);
  });
  it('regra órfã: kit só com kite avulso (sem barraPrice), vender o kite → fecha', () => {
    expect(shouldCloseListing(L({ hasBarra: true, kitePrice: 480000, barraPrice: null }), 'kite')).toBe(true);
  });
});

describe('priceOf', () => {
  it('kite/barra do kit → preço avulso', () => {
    const kit = L({ hasBarra: true, kitePrice: 480000, barraPrice: 180000 });
    expect(priceOf(kit, 'kite')).toBe(480000);
    expect(priceOf(kit, 'barra')).toBe(180000);
    expect(priceOf(kit, 'conjunto')).toBe(620000);
  });
  it('peça única → kite/barra dão null, conjunto dá price', () => {
    expect(priceOf(L(), 'kite')).toBe(null);
    expect(priceOf(L(), 'conjunto')).toBe(620000);
  });
});
