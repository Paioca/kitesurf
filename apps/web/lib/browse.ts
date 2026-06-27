import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { getCurrentUser } from './session';
import { parseFilters, PRICE_RANGES, PRICE_LABELS, SIZE_RANGES, SIZE_LABELS, type SP } from './filters';
import { sellables, applyReservations, type Component, type ListingLike } from './components';

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
  priceNote: string | null; // contexto do preço no card: "só o kite" / "só a barra" / "a partir de" / "kit completo"
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
  seller?: { id: string; name: string; avatar: string | null; rating: number | null; ratingCount: number } | null;
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
  novo_lacrado: 'Novo, lacrado', novo_10x: 'Pouco usado', semi_otimo: 'Seminovo, em ótimo estado',
  semi_desgaste: 'Seminovo, com sinais de uso', usado_desgaste: 'Usado, com desgaste visível',
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado',
};
const COND_ORDER = Object.keys(COND_LABEL);
const BLADDER_LABEL: Record<string, string> = { zero: 'Sem furo', microfuro_adesivado: 'Microfuro reparado' };
const MANG_LABEL: Record<string, string> = { original: 'Originais', ja_trocadas: 'Trocadas' };

// Renderiza o anúncio na "cara" certa pra busca. Na busca de barra, um kit vira
// a sua barra (foto/preço da barra); senão, a cara é o kite.
function toCard(l: any, persp: Perspective): Card {
  const showAvailableBarraFromPartialKit =
    persp === 'all' && l.hasBarra === true && l.kiteSoldAt != null && l.barraSoldAt == null && l.barraPrice != null;
  const showBarra = persp === 'barra' || showAvailableBarraFromPartialKit || (persp === 'all' && l.category?.slug === 'barra');
  // vendedor (quando a query incluiu l.user). rating preenchido em getBrowseData (batch).
  const seller = l.user ? { id: l.user.id, name: l.user.name ?? '', avatar: l.user.avatarUrl ?? null, rating: null as number | null, ratingCount: 0 } : null;

  if (showBarra) {
    const kit = l.hasBarra === true;
    const ba = (kit ? l.barraAttributes : l.attributes) ?? {};
    const price = kit ? l.barraPrice ?? l.price : l.price;
    const legacyBrand = typeof ba.compatible_brand === 'string' ? ba.compatible_brand : '';
    const barraBrandName = kit ? (l.barraBrand?.name ?? legacyBrand) : (l.brand?.name ?? legacyBrand);
    const barraModelName = kit ? (l.barraModel?.name ?? 'Barra do kit') : (l.model?.name ?? l.title);
    return {
      id: l.id,
      // Num kit, l.brand/l.model são do KITE. A barra tem relações próprias; legado
      // cai para compatible_brand ou texto genérico.
      brand: barraBrandName,
      model: barraModelName,
      year: kit ? l.barraYear ?? null : l.year ?? null,
      priceCents: price,
      priceLabel: brl(price),
      priceNote: kit ? 'só a barra' : null, // a barra é uma peça do kit, não o conjunto
      cat: 'Barra',
      catSlug: 'barra',
      ship: !!l.shippable,
      city: l.city,
      sizeM2: null,
      sizeLabel: 'Barra',
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
  // Rótulo do preço num kit (a peça mostrada ≠ o conjunto do detalhe — evita o
  // "card R$4.800 vs detalhe R$6.200"). Peça avulsa: nota explícita por perspectiva.
  let priceNote: string | null = null;
  if (l.hasBarra) {
    if (l.kitePrice == null) priceNote = 'kit completo'; // sem avulso → preço é o conjunto
    else if (persp === 'kite') priceNote = 'só o kite';
    else priceNote = 'a partir de'; // 'all': o kit começa no preço da peça mais barata
  }
  return {
    id: l.id,
    brand: l.brand?.name ?? '',
    model: l.model?.name ?? l.title,
    year: l.year ?? null,
    priceCents: price,
    priceLabel: brl(price),
    priceNote,
    cat: l.category?.namePt ?? '',
    catSlug: l.category?.slug ?? '',
    ship: !!l.shippable,
    city: l.city,
    sizeM2,
    sizeLabel: sizeM2 ? `${sizeM2} m²` : a.harness_size || a.bar_size || a.length_cm || l.category?.namePt || 'Não informado',
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
// `category.active: true` esconde anúncios de categoria fora do MVP (desativada)
// de toda busca/faceta — sem isso, desativar uma categoria não tira os anúncios dela do ar.
const BASE: Prisma.ListingWhereInput = { status: 'active', deletedAt: null, category: { is: { active: true } } };

// §7 — exclui da busca a face cuja peça está reservada (Deal seller_confirmed que
// conflita): "esconder não basta" é sobre o backend; aqui é só não listar como
// disponível. NOT EXISTS — mantém count/paginação corretos.
const noReservation = (...comps: Component[]): Prisma.ListingWhereInput =>
  ({ NOT: { deals: { some: { status: 'seller_confirmed', component: { in: comps } } } } });

// WHERE por perspectiva. Barra: barras compráveis (avulsa OU kit com barra avulsa),
// filtro só por cidade (preço/marca/tamanho da barra ficam pra depois). Kite/all:
// faceta completa (tamanho m², marca, cidade, preço, reparo, kit).
// Busca textual livre: casa em título, marca ou modelo (case-insensitive). Marca/
// modelo são listas controladas, então digitar "duotone" ou "rebel" já resolve.
function textWhere(q: string): Prisma.ListingWhereInput | null {
  if (!q) return null;
  return { OR: [
    { title: { contains: q, mode: 'insensitive' } },
    { brand: { is: { name: { contains: q, mode: 'insensitive' } } } },
    { model: { is: { name: { contains: q, mode: 'insensitive' } } } },
  ] };
}

function buildWhere(f: Filters, persp: Perspective): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  const qw = textWhere(f.q);
  if (qw) and.push(qw);
  if (persp === 'barra') {
    and.push({ OR: [{ category: { slug: 'barra' } }, { hasBarra: true, barraPrice: { not: null } }] });
    and.push({ barraSoldAt: null }); // esconde a barra do kit já vendida (anúncio fica na busca de kite)
    and.push(noReservation('barra', 'conjunto')); // barra reservada (ou conjunto) sai da busca de barra
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
    and.push(noReservation('kite', 'conjunto')); // kite reservado (ou conjunto) sai da busca de kite
  }
  if (persp === 'all') {
    // 'all' mostra a face de kite (não-barra) ou de barra (categoria barra): esconde
    // cada uma quando a peça mostrada está reservada.
    and.push({ NOT: { OR: [
      { category: { is: { slug: { not: 'barra' } } }, deals: { some: { status: 'seller_confirmed', component: { in: ['kite', 'conjunto'] as Component[] } } } },
      { category: { is: { slug: 'barra' } }, deals: { some: { status: 'seller_confirmed', component: { in: ['barra', 'conjunto'] as Component[] } } } },
    ] } });
  }
  if (f.cat === 'kit') and.push({ hasBarra: true }); // tipo "Kite + Barra" = kite com barra
  if (f.brand.length) and.push({ brand: { name: { in: f.brand } } });
  if (f.city.length) and.push({ city: { in: f.city } });
  // tamanho por FAIXA: cada chave de faixa vira [lo, hi) sobre attributes.size_m2 (JSON).
  if (f.size.length) {
    and.push({
      OR: f.size.map((k) => {
        const [lo, hi] = SIZE_RANGES[k] ?? [0, 1e6];
        return { AND: [{ attributes: { path: ['size_m2'], gte: lo } }, { attributes: { path: ['size_m2'], lt: hi } }] };
      }),
    });
  }
  if (f.price.length) {
    and.push({
      OR: f.price.map((k) => {
        // O fallback também deve caber no INT4 da coluna Listing.price.
        const [lo, hi] = PRICE_RANGES[k] ?? [0, 2_147_483_647];
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
// Consulta crua do dataset de facetas (TODOS os ativos). NÃO chamar direto —
// use loadActiveRows(), que adiciona o cache TTL na frente.
async function fetchActiveRows(): Promise<ActiveRow[]> {
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
}

// Cache de processo (TTL) do dataset de facetas. ANTES: cada busca baixava o
// catálogo inteiro do banco (O(N) por request, cross-region) — gargalo de escala
// apontado na auditoria de banco. AGORA: o catálogo é lido no máximo 1x por janela
// de TTL e compartilhado entre todos os requests da mesma instância (warm).
//
// Trade-off: as contagens das facetas podem ficar até ACTIVE_ROWS_TTL_MS
// desatualizadas (ex.: anúncio novo demora ~30s pra somar +1 numa faceta). Os
// CARDS e a paginação NÃO usam este cache — saem direto do banco com o WHERE
// completo, então o resultado da busca em si continua exato e em tempo real.
const ACTIVE_ROWS_TTL_MS = 30_000;
let _activeRows: { at: number; rows: ActiveRow[] } | null = null;
let _activeRowsInflight: Promise<ActiveRow[]> | null = null;

async function loadActiveRows(): Promise<ActiveRow[]> {
  const fresh = _activeRows && Date.now() - _activeRows.at < ACTIVE_ROWS_TTL_MS;
  if (fresh) return _activeRows!.rows;
  // Coalescência: no pico, dezenas de buscas concorrentes batem no cache vencido
  // ao mesmo tempo. Sem isto, cada uma dispararia a query pesada — exatamente o
  // colapso que queremos evitar. Com isto, todas aguardam a MESMA consulta.
  if (_activeRowsInflight) return _activeRowsInflight;
  _activeRowsInflight = fetchActiveRows()
    .then((rows) => {
      _activeRows = { at: Date.now(), rows };
      return rows;
    })
    .finally(() => {
      _activeRowsInflight = null;
    });
  return _activeRowsInflight;
}

// Invalida o cache na hora (chamar após criar/editar/remover/vender anúncio se
// quiser facetas instantâneas; opcional — o TTL já cobre em ~30s).
export function invalidateActiveRows() {
  _activeRows = null;
}

// --- Cache de reputação do vendedor -----------------------------------------
// A nota do vendedor (média de reviews de negócios concluídos) só muda quando um
// negócio fecha E ganha review — evento raro. Mesmo assim, ANTES, cada carregamento
// de home/busca disparava 1 query de reviews pra todos os vendedores da página.
// Como os MESMOS vendedores reaparecem em página após página, memoizamos por
// vendedor com TTL: só consulta o banco pros ids ausentes/vencidos. Diferente do
// cache de cards (que o time manteve em tempo real DE PROPÓSITO), aqui um atraso de
// ~60s numa nota nova é invisível — não há trade-off de frescura perceptível.
const RATINGS_TTL_MS = 60_000;
const RATINGS_MAX = 5000; // teto defensivo de memória (limpa tudo se estourar)
type RatingAgg = { rating: number | null; count: number };
const _ratings = new Map<string, { at: number; v: RatingAgg }>();

// Invalida a nota de um vendedor (chamar ao publicar review pra refletir na hora;
// opcional — o TTL já cobre em ~60s).
export function invalidateSellerRating(sellerId: string) {
  _ratings.delete(sellerId);
}

async function getSellerRatings(ids: string[]): Promise<Map<string, RatingAgg>> {
  const now = Date.now();
  const result = new Map<string, RatingAgg>();
  const missing: string[] = [];
  for (const id of ids) {
    const c = _ratings.get(id);
    if (c && now - c.at < RATINGS_TTL_MS) result.set(id, c.v);
    else missing.push(id);
  }
  if (missing.length) {
    if (_ratings.size > RATINGS_MAX) _ratings.clear();
    const revs = await db.review.findMany({ where: { reviewedId: { in: missing }, deal: { status: 'completed' } }, select: { reviewedId: true, rating: true } });
    const agg = new Map<string, { sum: number; n: number }>();
    for (const r of revs) { const e = agg.get(r.reviewedId) ?? { sum: 0, n: 0 }; e.sum += r.rating; e.n++; agg.set(r.reviewedId, e); }
    // Cacheia TAMBÉM "sem review" (rating null) — senão vendedor sem nota reconsulta
    // o banco a cada página.
    for (const id of missing) {
      const e = agg.get(id);
      const v: RatingAgg = e ? { rating: e.sum / e.n, count: e.n } : { rating: null, count: 0 };
      _ratings.set(id, { at: now, v });
      result.set(id, v);
    }
  }
  return result;
}

const priceBucket = (p: number) => (p < 50000 ? 'p1' : p < 200000 ? 'p2' : p < 500000 ? 'p3' : 'p4');
const sizeBucket = (s: number) => (s < 7 ? 's1' : s < 9 ? 's2' : s < 11 ? 's3' : s < 13 ? 's4' : 's5');

// Facetas CONTEXTUAIS: cada dimensão é contada aplicando todos os filtros ativos
// EXCETO o dela própria (padrão de busca facetada — a contagem bate com o resultado).
function computeFacets(rows: ActiveRow[], f: Filters, persp: Perspective): { facets: Facets; totalAll: number } {
  const inPersp = (r: ActiveRow) =>
    persp === 'barra' ? r.catSlug === 'barra' || (r.hasBarra && r.barraPrice != null && !r.barraSold)
      : persp === 'kite' ? r.catSlug === 'kite' && !r.kiteSold && (f.cat === 'kit' ? r.hasBarra : true)
        : true;

  const P = {
    size: (r: ActiveRow) => !f.size.length || (r.size != null && f.size.includes(sizeBucket(Number(r.size)))),
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
    size: list(tally(setExcept('size'), (r) => (r.size != null ? sizeBucket(Number(r.size)) : null)), (v) => SIZE_LABELS[v] ?? v).sort((a, b) => a.value.localeCompare(b.value)),
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
  const include = { images: { orderBy: { position: 'asc' as const }, take: 8 }, brand: true, model: true, barraBrand: true, barraModel: true, category: true, user: { select: { id: true, name: true, avatarUrl: true } } };

  // Ordenação por preço NO BANCO. O "preço efetivo" por perspectiva (barra:
  // COALESCE(barraPrice,price); kite: COALESCE(kitePrice,price); all: price) está
  // materializado nas colunas geradas kiteEffPrice/barraEffPrice — então orderBy +
  // skip/take rodam no Postgres (índice parcial), sem carregar tudo em memória.
  const priceSort = f.sort === 'price_asc' || f.sort === 'price_desc';
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = priceSort
    ? [
        (() => {
          const dir = f.sort === 'price_asc' ? 'asc' : 'desc';
          return persp === 'barra' ? { barraEffPrice: dir } : persp === 'kite' ? { kiteEffPrice: dir } : { price: dir };
        })(),
        { createdAt: 'desc' }, // desempate estável (mesmo critério da ordenação antiga)
      ]
    : [{ createdAt: 'desc' }];

  let raw: any[];
  let total: number;
  let rows: ActiveRow[];
  [raw, total, rows] = await Promise.all([
    db.listing.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, relationLoadStrategy: 'join', include }),
    db.listing.count({ where }),
    loadActiveRows(),
  ]);
  const fac = computeFacets(rows, f, persp);

  const items = raw.map((l) => toCard(l, persp));
  // reputação do vendedor (média de reviews de negócios concluídos) — memoizada por
  // vendedor com TTL (getSellerRatings): só bate no banco pros ids ausentes/vencidos.
  const sellerIds = [...new Set(items.map((i) => i.seller?.id).filter(Boolean))] as string[];
  if (sellerIds.length) {
    const ratings = await getSellerRatings(sellerIds);
    for (const it of items) { const r = it.seller && ratings.get(it.seller.id); if (it.seller && r) { it.seller.rating = r.rating; it.seller.ratingCount = r.count; } }
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
    include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, barraBrand: true, barraModel: true, category: true },
  });
  return raw.map((l) => ({ ...toCard(l, 'all'), status: l.status }));
}

// Anúncios favoritados (ativos) do usuário, como cards.
export async function getFavorites(userId: string): Promise<Card[]> {
  const favs = await db.favorite.findMany({
    where: { userId, listing: { status: 'active', deletedAt: null, category: { is: { active: true } } } },
    orderBy: { createdAt: 'desc' },
    include: { listing: { include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, barraBrand: true, barraModel: true, category: true, deals: { where: { status: 'seller_confirmed' }, select: { component: true } } } } },
  });
  return favs.flatMap((f) => {
    const card = toFavoriteCard(f.listing);
    return card ? [{ ...card, favorited: true }] : [];
  });
}

function toFavoriteCard(l: any): Card | null {
  const reserved = (l.deals ?? []).map((d: { component: Component }) => d.component);
  const available = applyReservations(sellables(l as ListingLike), reserved).filter((s) => s.available);
  if (available.length === 0) return null;

  const kiteAvailable = available.some((s) => s.component === 'conjunto' || s.component === 'kite');
  const barraAvailable = available.some((s) => s.component === 'barra');
  if (l.hasBarra === true && !kiteAvailable && barraAvailable) return toCard(l, 'barra');

  return toCard(l, 'all');
}
