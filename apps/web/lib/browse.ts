import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import { parseFilters, PRICE_RANGES, type SP } from './filters';

// Tag pra invalidar o cache quando um anúncio é criado/muda (revalidateTag).
export const LISTINGS_TAG = 'listings';

// Dados da busca — server-side. Para a escala de 1 hub, busca o conjunto ativo
// (cap 500) e calcula facetas + aplica filtros em memória no servidor (HTML
// indexável, zero fetch no cliente). Migrar pra agregação SQL quando crescer.
export type Card = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  priceCents: number;
  priceLabel: string;
  cat: string;
  catSlug: string;
  ship: boolean;
  city: string;
  sizeM2: string | null;
  sizeLabel: string;
  repair: boolean;
  photo: string | null;
};

export type Facet = { value: string; label: string; count: number };
export type Facets = {
  category: Facet[]; // chips (primário)
  size: Facet[]; // chips (o "aha")
  brand: Facet[];
  city: Facet[];
  price: Facet[];
  repair: Facet[];
};

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toCard(l: any): Card {
  const a = l.attributes ?? {};
  const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
  const sizeLabel = sizeM2 ? `${sizeM2} m²` : a.harness_size || a.bar_size || a.length_cm || l.category?.namePt || '—';
  return {
    id: l.id,
    brand: l.brand?.name ?? '',
    model: l.model?.name ?? l.title,
    year: l.year ?? null,
    priceCents: l.price,
    priceLabel: brl(l.price),
    cat: l.category?.namePt ?? '',
    catSlug: l.category?.slug ?? '',
    ship: !!l.shippable,
    city: l.city,
    sizeM2,
    sizeLabel: String(sizeLabel),
    repair: Number(a.repairs_count ?? 0) > 0,
    photo: l.images?.[0]?.url ?? null,
  };
}

function priceKey(cents: number): string | null {
  for (const [k, [lo, hi]] of Object.entries(PRICE_RANGES)) if (cents >= lo && cents < hi) return k;
  return null;
}

// Conta sobre o conjunto todo; só devolve opções com count > 0 (esconde zeros).
function facetCount<T>(items: Card[], pick: (c: Card) => T | null, labelOf: (v: T) => string): Facet[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    const v = pick(it);
    if (v == null || v === '') continue;
    const key = String(v);
    const cur = map.get(key) ?? { label: labelOf(v), count: 0 };
    cur.count++;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([value, { label, count }]) => ({ value, label, count }));
}

// Conjunto ativo (cap 500) como cards já mapeados — serializável e cacheável.
// relationLoadStrategy:'join' = 1 LATERAL JOIN em vez de ~5 round-trips ao banco.
// unstable_cache (revalidate 60s) tira o banco do caminho da maioria dos loads;
// invalidado na hora quando alguém publica (revalidateTag(LISTINGS_TAG)).
const loadActiveCards = unstable_cache(
  async (): Promise<Card[]> => {
    const raw = await db.listing.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 500,
      relationLoadStrategy: 'join',
      include: { images: { orderBy: { position: 'asc' }, take: 1 }, brand: true, model: true, category: true },
    });
    return raw.map(toCard);
  },
  ['browse:active-cards'],
  { revalidate: 60, tags: [LISTINGS_TAG] },
);

export async function getBrowseData(sp: SP) {
  const f = parseFilters(sp);

  const all = await loadActiveCards();

  // facetas (sobre o conjunto todo)
  const facets: Facets = {
    category: facetCount(all, (c) => c.catSlug || null, (v) => all.find((x) => x.catSlug === v)?.cat ?? v).sort((a, b) => a.label.localeCompare(b.label)),
    size: facetCount(all, (c) => c.sizeM2, (v) => `${v} m²`).sort((a, b) => Number(a.value) - Number(b.value)),
    brand: facetCount(all, (c) => c.brand || null, (v) => v).sort((a, b) => a.label.localeCompare(b.label)),
    city: facetCount(all, (c) => c.city || null, (v) => v).sort((a, b) => a.label.localeCompare(b.label)),
    price: facetCount(all, (c) => priceKey(c.priceCents), (v) => v).sort((a, b) => a.value.localeCompare(b.value)),
    repair: facetCount(all, (c) => (c.repair ? 'rep' : 'norep'), (v) => (v === 'rep' ? 'Com reparo' : 'Sem reparo')),
  };

  // aplica filtros selecionados
  let items = all.filter((c) => {
    if (f.cat && c.catSlug !== f.cat) return false;
    if (f.size.length && !(c.sizeM2 && f.size.includes(c.sizeM2))) return false;
    if (f.brand.length && !f.brand.includes(c.brand)) return false;
    if (f.city.length && !f.city.includes(c.city)) return false;
    if (f.repair.length && !f.repair.includes(c.repair ? 'rep' : 'norep')) return false;
    if (f.price.length) {
      const k = priceKey(c.priceCents);
      if (!k || !f.price.includes(k)) return false;
    }
    return true;
  });

  if (f.sort === 'price_asc') items = items.slice().sort((a, b) => a.priceCents - b.priceCents);
  else if (f.sort === 'price_desc') items = items.slice().sort((a, b) => b.priceCents - a.priceCents);

  return { items, facets, total: items.length, totalAll: all.length, filters: f };
}
