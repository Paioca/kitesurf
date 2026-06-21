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
  // vendedor (só na busca; ausente em perfil/meus anúncios). rating = média de reviews públicas.
  seller?: { id: string; name: string; avatar: string | null; ig: string | null; rating: number | null; ratingCount: number } | null;
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
  cond: Facet[]; // condição (ficha)
  bladder: Facet[];
  mang: Facet[]; // mangueiras
  delivery: Facet[]; // retirada / envio
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
  // 'kit' = kite + barra → perspectiva de kite (filtra hasBarra no WHERE)
  return f.cat === 'barra' ? 'barra' : f.cat === 'kite' || f.cat === 'kit' ? 'kite' : 'all';
}

const COND_LABEL: Record<string, string> = {
  novo_lacrado: 'Novo (lacrado)', novo_10x: 'Novo · pouco uso', semi_otimo: 'Seminovo · ótimo',
  semi_desgaste: 'Seminovo · desgaste', usado_desgaste: 'Usado · desgaste',
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado',
};
const COND_ORDER = Object.keys(COND_LABEL);
const BLADDER_LABEL: Record<string, string> = { zero: 'Bladder zero', microfuro_adesivado: 'Microfuro adesivado' };
const MANG_LABEL: Record<string, string> = { original: 'Originais', ja_trocadas: 'Já trocadas' };

// Renderiza o anúncio na "cara" certa pra busca. Na busca de barra, um kit vira
// a sua barra (foto/comprimento/preço da barra); senão, a cara é o kite.
function toCard(l: any, persp: Perspective): Card {
  const showBarra = persp === 'barra' || (persp === 'all' && l.category?.slug === 'barra');
  // vendedor (quando a query incluiu l.user). rating preenchido em getBrowseData (batch).
  const seller = l.user ? { id: l.user.id, name: l.user.name ?? '', avatar: l.user.avatarUrl ?? null, ig: l.user.instagramHandle ?? null, rating: null as number | null, ratingCount: 0 } : null;

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
      seller,
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
    includesBar: l.hasBarra === true && l.barraSoldAt == null, // a barra avulsa do kit já saiu? sem badge "+ Barra"
    partOfKit: false,
    favorited: false,
    photo: pickPhoto(l.images, 'kite'),
    seller,
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
    and.push({ barraSoldAt: null }); // esconde a barra do kit já vendida (anúncio fica na busca de kite)
    if (f.city.length) and.push({ city: { in: f.city } });
    if (f.delivery.length) {
      const opts: Prisma.ListingWhereInput[] = [];
      if (f.delivery.includes('local')) opts.push({ pickup: true });
      if (f.delivery.includes('ship')) opts.push({ shippable: true });
      if (opts.length) and.push({ OR: opts });
    }
    return { ...BASE, AND: and };
  }
  if (persp === 'kite') {
    and.push({ category: { slug: 'kite' } });
    and.push({ kiteSoldAt: null }); // esconde o kite do kit já vendido (anúncio fica na busca de barra)
  }
  if (f.cat === 'kit') and.push({ hasBarra: true }); // tipo "Kite + Barra" = kite com barra
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
  if (f.cond.length) and.push({ OR: f.cond.map((c) => ({ attributes: { path: ['condition'], equals: c } })) });
  if (f.bladder.length) and.push({ OR: f.bladder.map((b) => ({ attributes: { path: ['bladder'], equals: b } })) });
  if (f.mang.length) and.push({ OR: f.mang.map((m) => ({ attributes: { path: ['mangueiras'], equals: m } })) });
  if (f.delivery.length) {
    const opts: Prisma.ListingWhereInput[] = [];
    if (f.delivery.includes('local')) opts.push({ pickup: true });
    if (f.delivery.includes('ship')) opts.push({ shippable: true });
    if (opts.length) and.push({ OR: opts });
  }
  if (f.withbar.includes('1')) and.push({ hasBarra: true });
  return { ...BASE, AND: and };
}

// Dataset cru (leve) de TODOS os ativos — cacheável. As facetas são calculadas
// a partir daqui em JS, de forma CONTEXTUAL (refletindo os filtros ativos).
type ActiveRow = {
  price: number; city: string; hasBarra: boolean; barraPrice: number | null;
  pickup: boolean; shippable: boolean; catSlug: string;
  brandName: string | null; size: string | null; cond: string | null;
  bladder: string | null; mang: string | null; repair: boolean;
  kiteSold: boolean; barraSold: boolean; // peça avulsa do kit já vendida
};
const loadActiveRows = unstable_cache(
  async (): Promise<ActiveRow[]> => {
    const rows = await db.listing.findMany({
      where: BASE,
      select: { price: true, city: true, hasBarra: true, barraPrice: true, pickup: true, shippable: true, attributes: true, kiteSoldAt: true, barraSoldAt: true, category: { select: { slug: true } }, brand: { select: { name: true } } },
    });
    return rows.map((r) => {
      const a = (r.attributes ?? {}) as Record<string, any>;
      return {
        price: r.price, city: r.city, hasBarra: r.hasBarra === true, barraPrice: r.barraPrice ?? null,
        pickup: !!r.pickup, shippable: !!r.shippable, catSlug: r.category?.slug ?? '', brandName: r.brand?.name ?? null,
        size: a.size_m2 != null ? String(a.size_m2) : null, cond: a.condition ?? null,
        bladder: a.bladder ?? null, mang: a.mangueiras ?? null, repair: Number(a.repairs_count ?? 0) > 0,
        kiteSold: r.kiteSoldAt != null, barraSold: r.barraSoldAt != null,
      };
    });
  },
  ['browse:active-rows'],
  { revalidate: 60, tags: [LISTINGS_TAG] },
);

const priceBucket = (p: number) => (p < 50000 ? 'p1' : p < 200000 ? 'p2' : p < 500000 ? 'p3' : 'p4');

// Facetas CONTEXTUAIS: cada dimensão é contada aplicando todos os filtros ativos
// EXCETO o dela própria (padrão de busca facetada — a contagem bate com o resultado).
function computeFacets(rows: ActiveRow[], f: Filters, persp: Perspective): { facets: Facets; totalAll: number } {
  const inPersp = (r: ActiveRow) =>
    persp === 'barra' ? r.catSlug === 'barra' || (r.hasBarra && r.barraPrice != null && !r.barraSold)
      : persp === 'kite' ? r.catSlug === 'kite' && !r.kiteSold && (f.cat === 'kit' ? r.hasBarra : true)
        : true;

  const P = {
    size: (r: ActiveRow) => !f.size.length || (r.size != null && f.size.includes(r.size)),
    cond: (r: ActiveRow) => !f.cond.length || (r.cond != null && f.cond.includes(r.cond)),
    bladder: (r: ActiveRow) => !f.bladder.length || (r.bladder != null && f.bladder.includes(r.bladder)),
    mang: (r: ActiveRow) => !f.mang.length || (r.mang != null && f.mang.includes(r.mang)),
    brand: (r: ActiveRow) => !f.brand.length || (r.brandName != null && f.brand.includes(r.brandName)),
    city: (r: ActiveRow) => !f.city.length || f.city.includes(r.city),
    price: (r: ActiveRow) => !f.price.length || f.price.includes(priceBucket(r.price)),
    repair: (r: ActiveRow) => !f.repair.length || f.repair.includes(r.repair ? 'rep' : 'norep'),
    withbar: (r: ActiveRow) => !f.withbar.includes('1') || r.hasBarra,
    delivery: (r: ActiveRow) => !f.delivery.length || (f.delivery.includes('local') && r.pickup) || (f.delivery.includes('ship') && r.shippable),
  };
  type DimKey = keyof typeof P;
  const keys = Object.keys(P) as DimKey[];
  const setExcept = (except: DimKey) => rows.filter((r) => inPersp(r) && keys.every((k) => k === except || P[k](r)));
  const tally = (set: ActiveRow[], val: (r: ActiveRow) => string | null) => {
    const m = new Map<string, number>();
    for (const r of set) { const v = val(r); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
    return m;
  };
  const list = (m: Map<string, number>, label: (v: string) => string) => [...m].map(([value, count]) => ({ value, label: label(value), count }));

  const dM = setExcept('delivery');
  const wM = setExcept('withbar');
  // categoria conta sobre filtros cross-categoria (city/price/delivery/brand), sem restrição de perspectiva
  const catSet = rows.filter((r) => P.city(r) && P.price(r) && P.delivery(r) && P.brand(r));
  const kiteCount = catSet.filter((r) => r.catSlug === 'kite' && !r.kiteSold).length;
  const barraCount = catSet.filter((r) => r.catSlug === 'barra' || (r.hasBarra && r.barraPrice != null && !r.barraSold)).length;
  const withbarCount = wM.filter((r) => r.hasBarra).length;
  const pickupCount = dM.filter((r) => r.pickup).length;
  const shipCount = dM.filter((r) => r.shippable).length;

  const facets: Facets = {
    category: [
      ...(kiteCount > 0 ? [{ value: 'kite', label: 'Kite', count: kiteCount }] : []),
      ...(barraCount > 0 ? [{ value: 'barra', label: 'Barra', count: barraCount }] : []),
    ],
    size: list(tally(setExcept('size'), (r) => r.size), (v) => `${v} m²`).sort((a, b) => Number(a.value) - Number(b.value)),
    brand: list(tally(setExcept('brand'), (r) => r.brandName), (v) => v).sort((a, b) => a.label.localeCompare(b.label)),
    city: list(tally(setExcept('city'), (r) => r.city), (v) => v).sort((a, b) => a.label.localeCompare(b.label)),
    price: list(tally(setExcept('price'), (r) => priceBucket(r.price)), (v) => PRICE_LABELS[v] ?? v).sort((a, b) => a.value.localeCompare(b.value)),
    repair: list(tally(setExcept('repair'), (r) => (r.repair ? 'rep' : 'norep')), (v) => (v === 'rep' ? 'Com reparo' : 'Sem reparo')),
    withbar: withbarCount > 0 ? [{ value: '1', label: 'Vem com barra (kit)', count: withbarCount }] : [],
    cond: list(tally(setExcept('cond'), (r) => r.cond), (v) => COND_LABEL[v] ?? v).sort((a, b) => (COND_ORDER.indexOf(a.value) + 1 || 99) - (COND_ORDER.indexOf(b.value) + 1 || 99)),
    bladder: list(tally(setExcept('bladder'), (r) => r.bladder), (v) => BLADDER_LABEL[v] ?? v),
    mang: list(tally(setExcept('mang'), (r) => r.mang), (v) => MANG_LABEL[v] ?? v),
    delivery: [
      ...(pickupCount > 0 ? [{ value: 'local', label: 'Retirada', count: pickupCount }] : []),
      ...(shipCount > 0 ? [{ value: 'ship', label: 'Envio', count: shipCount }] : []),
    ],
  };
  return { facets, totalAll: rows.length };
}

export async function getBrowseData(sp: SP) {
  const f = parseFilters(sp);
  const persp = perspectiveOf(f);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const where = buildWhere(f, persp);
  const include = { images: { orderBy: { position: 'asc' as const }, take: 8 }, brand: true, model: true, category: true, user: { select: { id: true, name: true, avatarUrl: true, instagramHandle: true } } };

  // Preço efetivo POR PERSPECTIVA (barra: barraPrice; kite: kitePrice; senão price)
  // — o mesmo que o card mostra. Ordenar por ele exige COALESCE, que o orderBy do
  // Prisma não expressa, então a ordenação por preço é feita em memória sobre um
  // select leve (paginação preservada). Sem isso, a barra ordenava pelo preço do kit.
  const priceSort = f.sort === 'price_asc' || f.sort === 'price_desc';

  let raw: any[];
  let total: number;
  let rows: ActiveRow[];
  if (priceSort) {
    const [lite, activeRows] = await Promise.all([
      db.listing.findMany({ where, select: { id: true, price: true, kitePrice: true, barraPrice: true, createdAt: true } }),
      loadActiveRows(),
    ]);
    rows = activeRows;
    total = lite.length;
    const eff = (r: { price: number; kitePrice: number | null; barraPrice: number | null }) =>
      persp === 'barra' ? r.barraPrice ?? r.price : persp === 'kite' ? r.kitePrice ?? r.price : r.price;
    const dir = f.sort === 'price_asc' ? 1 : -1;
    lite.sort((a, b) => (eff(a) - eff(b)) * dir || b.createdAt.getTime() - a.createdAt.getTime());
    const pageIds = lite.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id);
    const recs = await db.listing.findMany({ where: { id: { in: pageIds } }, relationLoadStrategy: 'join', include });
    const pos = new Map(pageIds.map((id, i) => [id, i]));
    raw = recs.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
  } else {
    [raw, total, rows] = await Promise.all([
      db.listing.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, relationLoadStrategy: 'join', include }),
      db.listing.count({ where }),
      loadActiveRows(),
    ]);
  }
  const fac = computeFacets(rows, f, persp);

  const items = raw.map((l) => toCard(l, persp));
  // reputação do vendedor (média de reviews de negócios concluídos) — 1 query batch
  const sellerIds = [...new Set(items.map((i) => i.seller?.id).filter(Boolean))] as string[];
  if (sellerIds.length) {
    const revs = await db.review.findMany({ where: { reviewedId: { in: sellerIds }, deal: { status: 'completed' } }, select: { reviewedId: true, rating: true } });
    const agg = new Map<string, { sum: number; n: number }>();
    for (const r of revs) { const e = agg.get(r.reviewedId) ?? { sum: 0, n: 0 }; e.sum += r.rating; e.n++; agg.set(r.reviewedId, e); }
    for (const it of items) { const e = it.seller && agg.get(it.seller.id); if (it.seller && e) { it.seller.rating = e.sum / e.n; it.seller.ratingCount = e.n; } }
  }
  // marca quais o usuário logado já favoritou (1 query)
  const me = await getCurrentUser();
  if (me && items.length) {
    const favs = await db.favorite.findMany({ where: { userId: me.id, listingId: { in: items.map((i) => i.id) } }, select: { listingId: true } });
    const favSet = new Set(favs.map((f) => f.listingId));
    items.forEach((it) => { it.favorited = favSet.has(it.id); });
  }
  // Na busca de barra, mostra só categoria + cidade (resto é kite-específico).
  const facets: Facets =
    persp === 'barra' ? { ...fac.facets, size: [], brand: [], price: [], repair: [], withbar: [], cond: [], bladder: [], mang: [] } : fac.facets;
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
