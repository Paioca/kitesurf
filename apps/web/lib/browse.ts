import 'server-only';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { parseFilters, PRICE_RANGES, PRICE_LABELS, type SP } from './filters';

// Tag pra invalidar o cache quando um anúncio é criado/muda (revalidateTag).
export const LISTINGS_TAG = 'listings';
export const PAGE_SIZE = 24;

// Dados da busca — server-side, SQL puro. Resultados filtrados + paginados no
// banco (sem teto), facetas por agregação SQL (groupBy + um raw query no JSONB).
// HTML indexável, zero fetch no cliente. Facetas contam sobre TODOS os ativos
// (independem do filtro), então são cacheadas e invalidadas no publish.
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
    photo: l.images?.[0]?.thumbUrl ?? l.images?.[0]?.url ?? null, // thumb 400px nos cards; url 1600px só no detalhe
  };
}

type Filters = ReturnType<typeof parseFilters>;
const BASE: Prisma.ListingWhereInput = { status: 'active', deletedAt: null };

// WHERE SQL a partir dos filtros multi-seleção (AND entre dimensões, OR dentro).
function buildWhere(f: Filters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  if (f.cat) and.push({ category: { slug: f.cat } });
  if (f.brand.length) and.push({ brand: { name: { in: f.brand } } });
  if (f.city.length) and.push({ city: { in: f.city } });
  if (f.size.length) and.push({ OR: f.size.map((s) => ({ attributes: { path: ['size_m2'], equals: Number(s) } })) });
  if (f.price.length) {
    and.push({
      OR: f.price.map((k) => {
        const [lo, hi] = PRICE_RANGES[k] ?? [0, 1e12];
        return { price: { gte: lo, lt: hi } };
      }),
    });
  }
  // reparo: 'rep' = repairs_count > 0; 'norep' = o contrário. Os dois juntos = sem filtro.
  if (f.repair.length === 1) {
    const rep: Prisma.ListingWhereInput = { attributes: { path: ['repairs_count'], gt: 0 } };
    and.push(f.repair[0] === 'rep' ? rep : { NOT: rep });
  }
  return { ...BASE, AND: and };
}

// Facetas sobre TODOS os ativos (independem do filtro do usuário) → cacheáveis.
// Colunas/relações via groupBy; tamanho/preço/reparo (derivados do JSONB) via raw SQL.
const loadFacets = unstable_cache(
  async (): Promise<{ facets: Facets; totalAll: number }> => {
    const [catG, brandG, cityG, cats, brands, sizeR, priceR, repairR] = await Promise.all([
      db.listing.groupBy({ by: ['categoryId'], where: BASE, _count: { _all: true } }),
      db.listing.groupBy({ by: ['brandId'], where: { ...BASE, brandId: { not: null } }, _count: { _all: true } }),
      db.listing.groupBy({ by: ['city'], where: BASE, _count: { _all: true } }),
      db.category.findMany({ select: { id: true, slug: true, namePt: true } }),
      db.brand.findMany({ select: { id: true, name: true } }),
      db.$queryRaw<{ v: string; count: number }[]>`
        SELECT attributes->>'size_m2' AS v, COUNT(*)::int AS count
        FROM "Listing" WHERE status='active' AND "deletedAt" IS NULL AND attributes->>'size_m2' IS NOT NULL
        GROUP BY 1`,
      db.$queryRaw<{ k: string; count: number }[]>`
        SELECT CASE WHEN price < 50000 THEN 'p1' WHEN price < 200000 THEN 'p2'
                    WHEN price < 500000 THEN 'p3' ELSE 'p4' END AS k, COUNT(*)::int AS count
        FROM "Listing" WHERE status='active' AND "deletedAt" IS NULL GROUP BY 1`,
      db.$queryRaw<{ k: string; count: number }[]>`
        SELECT CASE WHEN (attributes->>'repairs_count') ~ '^[0-9]+$' AND (attributes->>'repairs_count')::int > 0
                    THEN 'rep' ELSE 'norep' END AS k, COUNT(*)::int AS count
        FROM "Listing" WHERE status='active' AND "deletedAt" IS NULL GROUP BY 1`,
    ]);

    const catMap = new Map(cats.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b.name]));

    const facets: Facets = {
      category: catG
        .map((g) => ({ value: catMap.get(g.categoryId)?.slug ?? '', label: catMap.get(g.categoryId)?.namePt ?? '', count: g._count._all }))
        .filter((o) => o.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
      size: sizeR
        .filter((r) => r.v)
        .map((r) => ({ value: r.v, label: `${r.v} m²`, count: Number(r.count) }))
        .sort((a, b) => Number(a.value) - Number(b.value)),
      brand: brandG
        .map((g) => ({ value: brandMap.get(g.brandId!) ?? '', label: brandMap.get(g.brandId!) ?? '', count: g._count._all }))
        .filter((o) => o.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
      city: cityG
        .map((g) => ({ value: g.city, label: g.city, count: g._count._all }))
        .filter((o) => o.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
      price: priceR
        .map((r) => ({ value: r.k, label: PRICE_LABELS[r.k] ?? r.k, count: Number(r.count) }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      repair: repairR.map((r) => ({ value: r.k, label: r.k === 'rep' ? 'Com reparo' : 'Sem reparo', count: Number(r.count) })),
    };

    const totalAll = priceR.reduce((s, r) => s + Number(r.count), 0);
    return { facets, totalAll };
  },
  ['browse:facets'],
  { revalidate: 60, tags: [LISTINGS_TAG] },
);

export async function getBrowseData(sp: SP) {
  const f = parseFilters(sp);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const where = buildWhere(f);
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    f.sort === 'price_asc' ? { price: 'asc' } : f.sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' };

  const [raw, total, fac] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      relationLoadStrategy: 'join',
      include: { images: { orderBy: { position: 'asc' }, take: 1 }, brand: true, model: true, category: true },
    }),
    db.listing.count({ where }),
    loadFacets(),
  ]);

  const items = raw.map(toCard);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { items, facets: fac.facets, total, totalAll: fac.totalAll, filters: f, page, pageSize: PAGE_SIZE, totalPages };
}
