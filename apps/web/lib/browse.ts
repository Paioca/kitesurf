import 'server-only';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { getCurrentUser } from './session';
import { parseFilters, PRICE_RANGES, PRICE_LABELS, type SP } from './filters';

// Tag pra invalidar o cache quando um anúncio é criado/muda (revalidateTag).
export const LISTINGS_TAG = 'listings';
export const PAGE_SIZE = 24;

// Busca SQL paginada (sem teto), por PERSPECTIVA: a mesma listagem aparece como
// "kite" na busca de kite e como "barra" na de barra. Kit = anúncio de kite com
// hasBarra; sua barra entra na busca de barra só quando é vendável avulsa (barraPrice).
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
  condLabel: string | null; // rótulo da condição (pill no card)
  repair: boolean;
  includesBar: boolean; // kite que vem com barra (badge "+ Barra")
  partOfKit: boolean; // barra mostrada na busca de barra que faz parte de um kit
  favorited: boolean; // o usuário logado já favoritou
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
  withbar: Facet[]; // kites que acompanham barra (kit)
};

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pickPhoto(images: any[], component: string): string | null {
  const img = (images ?? []).find((i) => i.component === component) ?? (images ?? [])[0];
  return img?.thumbUrl ?? img?.url ?? null;
}

type Perspective = 'kite' | 'barra' | 'all';
function perspectiveOf(f: Filters): Perspective {
  return f.cat === 'barra' ? 'barra' : f.cat === 'kite' ? 'kite' : 'all';
}

const COND_LABEL: Record<string, string> = {
  novo_lacrado: 'Novo (lacrado)', novo_10x: 'Novo · pouco uso', semi_otimo: 'Seminovo · ótimo',
  semi_desgaste: 'Seminovo · desgaste', usado_desgaste: 'Usado · desgaste',
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado',
};

// Renderiza o anúncio na "cara" certa pra busca. Na busca de barra, um kit vira
// a sua barra (foto/comprimento/preço da barra); senão, a cara é o kite.
function toCard(l: any, persp: Perspective): Card {
  const showBarra = persp === 'barra' || (persp === 'all' && l.category?.slug === 'barra');

  if (showBarra) {
    const kit = l.hasBarra === true;
    const ba = (kit ? l.barraAttributes : l.attributes) ?? {};
    const len = ba.line_length_m != null ? String(ba.line_length_m) : null;
    const price = kit ? l.barraPrice ?? l.price : l.price;
    return {
      id: l.id,
      brand: (ba.compatible_brand as string) || l.brand?.name || '',
      model: kit ? 'Barra do kit' : l.model?.name ?? l.title,
      year: null,
      priceCents: price,
      priceLabel: brl(price),
      cat: 'Barra',
      catSlug: 'barra',
      ship: !!l.shippable,
      city: l.city,
      sizeM2: null,
      sizeLabel: len ? `linhas ${len} m` : 'Barra',
      condLabel: ba.condition ? (COND_LABEL[ba.condition] ?? ba.condition) : null,
      repair: false,
      includesBar: false,
      partOfKit: kit,
      favorited: false,
      photo: pickPhoto(l.images, 'barra'),
    };
  }

  // cara de kite (kite avulso ou kit). Preço = kite avulso quando houver, senão o cheio.
  const a = l.attributes ?? {};
  const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
  const price = l.hasBarra ? l.kitePrice ?? l.price : l.price;
  return {
    id: l.id,
    brand: l.brand?.name ?? '',
    model: l.model?.name ?? l.title,
    year: l.year ?? null,
    priceCents: price,
    priceLabel: brl(price),
    cat: l.category?.namePt ?? '',
    catSlug: l.category?.slug ?? '',
    ship: !!l.shippable,
    city: l.city,
    sizeM2,
    sizeLabel: sizeM2 ? `${sizeM2} m²` : a.harness_size || a.bar_size || a.length_cm || l.category?.namePt || '—',
    condLabel: a.condition ? (COND_LABEL[a.condition] ?? a.condition) : null,
    repair: Number(a.repairs_count ?? 0) > 0,
    includesBar: l.hasBarra === true,
    partOfKit: false,
    favorited: false,
    photo: pickPhoto(l.images, 'kite'),
  };
}

type Filters = ReturnType<typeof parseFilters>;
const BASE: Prisma.ListingWhereInput = { status: 'active', deletedAt: null };

// WHERE por perspectiva. Barra: barras compráveis (avulsa OU kit com barra avulsa),
// filtro só por cidade (preço/marca/tamanho da barra ficam pra depois). Kite/all:
// faceta completa (tamanho m², marca, cidade, preço, reparo, kit).
function buildWhere(f: Filters, persp: Perspective): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  if (persp === 'barra') {
    and.push({ OR: [{ category: { slug: 'barra' } }, { hasBarra: true, barraPrice: { not: null } }] });
    if (f.city.length) and.push({ city: { in: f.city } });
    return { ...BASE, AND: and };
  }
  if (persp === 'kite') and.push({ category: { slug: 'kite' } });
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
  if (f.repair.length === 1) {
    const rep: Prisma.ListingWhereInput = { attributes: { path: ['repairs_count'], gt: 0 } };
    and.push(f.repair[0] === 'rep' ? rep : { NOT: rep });
  }
  if (f.withbar.includes('1')) and.push({ hasBarra: true });
  return { ...BASE, AND: and };
}

// Facetas sobre TODOS os ativos → cacheáveis. A contagem de "Barra" inclui os kits
// com barra avulsa (que aparecem na busca de barra).
const loadFacets = unstable_cache(
  async (): Promise<{ facets: Facets; totalAll: number }> => {
    const [catG, brandG, cityG, cats, brands, sizeR, priceR, repairR, withbarR, kitBarraR] = await Promise.all([
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
      db.listing.count({ where: { ...BASE, hasBarra: true } }),
      db.listing.count({ where: { ...BASE, hasBarra: true, barraPrice: { not: null } } }),
    ]);

    const catMap = new Map(cats.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b.name]));

    const facets: Facets = {
      category: catG
        .map((g) => {
          const slug = catMap.get(g.categoryId)?.slug ?? '';
          // barras compráveis = barra-only + kits com barra avulsa
          const count = slug === 'barra' ? g._count._all + kitBarraR : g._count._all;
          return { value: slug, label: catMap.get(g.categoryId)?.namePt ?? '', count };
        })
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
      withbar: Number(withbarR) > 0 ? [{ value: '1', label: 'Vem com barra (kit)', count: Number(withbarR) }] : [],
    };

    const totalAll = priceR.reduce((s, r) => s + Number(r.count), 0);
    return { facets, totalAll };
  },
  ['browse:facets'],
  { revalidate: 60, tags: [LISTINGS_TAG] },
);

export async function getBrowseData(sp: SP) {
  const f = parseFilters(sp);
  const persp = perspectiveOf(f);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const where = buildWhere(f, persp);
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    f.sort === 'price_asc' ? { price: 'asc' } : f.sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' };

  const [raw, total, fac] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      relationLoadStrategy: 'join',
      include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, category: true },
    }),
    db.listing.count({ where }),
    loadFacets(),
  ]);

  const items = raw.map((l) => toCard(l, persp));
  // marca quais o usuário logado já favoritou (1 query)
  const me = await getCurrentUser();
  if (me && items.length) {
    const favs = await db.favorite.findMany({ where: { userId: me.id, listingId: { in: items.map((i) => i.id) } }, select: { listingId: true } });
    const favSet = new Set(favs.map((f) => f.listingId));
    items.forEach((it) => { it.favorited = favSet.has(it.id); });
  }
  // Na busca de barra, mostra só categoria + cidade (resto é kite-específico).
  const facets: Facets =
    persp === 'barra' ? { ...fac.facets, size: [], brand: [], price: [], repair: [], withbar: [] } : fac.facets;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { items, facets, total, totalAll: fac.totalAll, filters: f, page, pageSize: PAGE_SIZE, totalPages };
}

// Anúncios do próprio usuário (todos os status, menos excluídos) — cards + status.
export async function getMyListings(userId: string): Promise<(Card & { status: string })[]> {
  const raw = await db.listing.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, category: true },
  });
  return raw.map((l) => ({ ...toCard(l, 'all'), status: l.status }));
}

// Anúncios favoritados (ativos) do usuário, como cards.
export async function getFavorites(userId: string): Promise<Card[]> {
  const favs = await db.favorite.findMany({
    where: { userId, listing: { status: 'active', deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    include: { listing: { include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, category: true } } },
  });
  return favs.map((f) => ({ ...toCard(f.listing, 'all'), favorited: true }));
}
