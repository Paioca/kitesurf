// Helpers de filtro por URL (server-safe). Filtros viram querystring →
// busca server-rendered, compartilhável e indexável.
export type SP = Record<string, string | string[] | undefined>;

// Taxonomia controlada (lista fechada) — usada na busca-builder do hero, onde se
// oferece o vocabulário completo, não só os valores presentes no banco (facetas).
export const SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '14', '17'];
export const SPOTS = ['Cumbuco', 'Taíba', 'Fortaleza', 'Praia do Futuro', 'Paracuru', 'Ilha do Guajiru', 'Preá'];
// Tipos de anúncio. 'kit' = kite com barra (hasBarra) — não é uma categoria, é o combo.
export const CAT_LABEL: Record<string, string> = { kite: 'Kite', barra: 'Barra', kit: 'Kite + Barra' };

// Faixas de tamanho (m²) — busca por FAIXA (o cadastro aceita decimal: 8.1, 13.5).
// [lo, hi): size >= lo && size < hi. s5 é "13+".
export const SIZE_RANGES: Record<string, [number, number]> = {
  s1: [0, 7],
  s2: [7, 9],
  s3: [9, 11],
  s4: [11, 13],
  s5: [13, 1e6],
};
export const SIZE_LABELS: Record<string, string> = {
  s1: 'até 7 m²',
  s2: '7 a 9 m²',
  s3: '9 a 11 m²',
  s4: '11 a 13 m²',
  s5: '13 m² ou +',
};

export const PRICE_RANGES: Record<string, [number, number]> = {
  p1: [0, 50000],
  p2: [50000, 200000],
  p3: [200000, 500000],
  // Listing.price é Int/PostgreSQL INT4. O teto precisa caber em 32 bits.
  p4: [500000, 2_147_483_647],
};
export const PRICE_LABELS: Record<string, string> = {
  p1: 'Até R$ 500',
  p2: 'R$ 500 a 2.000',
  p3: 'R$ 2.000 a 5.000',
  p4: 'Acima de R$ 5.000',
};

function one(sp: SP, key: string): string {
  const v = sp[key];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

// multi-valor = lista separada por vírgula (ex.: size=9,12)
export function list(sp: SP, key: string): string[] {
  const raw = one(sp, key);
  return raw ? raw.split(',').filter(Boolean) : [];
}

export function parseFilters(sp: SP) {
  return {
    q: one(sp, 'q').trim(),
    cat: one(sp, 'cat'),
    size: list(sp, 'size'),
    brand: list(sp, 'brand'),
    city: list(sp, 'city'),
    price: list(sp, 'price'),
    repair: list(sp, 'repair'),
    withbar: list(sp, 'withbar'),
    cond: list(sp, 'cond'),
    bladder: list(sp, 'bladder'),
    mang: list(sp, 'mang'),
    delivery: list(sp, 'delivery'),
    sort: one(sp, 'sort') || 'recent',
  };
}

function toQuery(sp: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/?${s}` : '/';
}

function current(sp: SP): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ['q', 'cat', 'size', 'brand', 'city', 'price', 'repair', 'withbar', 'cond', 'bladder', 'mang', 'delivery', 'sort', 'b']) {
    const v = one(sp, k);
    if (v) out[k] = v;
  }
  return out;
}

// href que LIGA/DESLIGA um valor multi-seleção
export function toggleHref(sp: SP, key: string, value: string): string {
  const cur = current(sp);
  const arr = (cur[key] ? cur[key].split(',') : []).filter(Boolean);
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(value);
  if (arr.length) cur[key] = arr.join(',');
  else delete cur[key];
  return toQuery(cur);
}

// href que SETA um valor único (categoria, sort) — toggle se já ativo
export function setHref(sp: SP, key: string, value: string, toggle = false): string {
  const cur = current(sp);
  if (toggle && cur[key] === value) delete cur[key];
  else cur[key] = value;
  return toQuery(cur);
}

// href que troca a página, preservando filtros (page some quando = 1).
export function pageHref(sp: SP, page: number): string {
  const cur = current(sp);
  if (page > 1) cur.page = String(page);
  return toQuery(cur);
}

// limpa TUDO → volta à landing (usado pelo "Todos" da landing)
export function clearHref(sp: SP): string {
  const sort = one(sp, 'sort');
  return toQuery(sort ? { sort } : {});
}

// limpa os filtros mas FICA na busca (grid + sidebar) — flag b=1 mantém a visão
export function clearFiltersHref(sp: SP): string {
  const sort = one(sp, 'sort');
  return toQuery({ b: '1', ...(sort ? { sort } : {}) });
}

// URL atual SEM o flag de sheet aberto (fs) — usada pra "fechar/aplicar" o bottom
// sheet mobile. current() já não inclui 'fs', então isto preserva filtros e descarta fs.
export function currentHref(sp: SP): string {
  return toQuery(current(sp));
}

export function hasAnyFilter(sp: SP): boolean {
  const f = parseFilters(sp);
  return !!(f.q || f.cat || f.size.length || f.brand.length || f.city.length || f.price.length || f.repair.length || f.withbar.length || f.cond.length || f.bladder.length || f.mang.length || f.delivery.length);
}
