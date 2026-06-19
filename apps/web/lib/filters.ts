// Helpers de filtro por URL (server-safe). Filtros viram querystring →
// busca server-rendered, compartilhável e indexável.
export type SP = Record<string, string | string[] | undefined>;

export const PRICE_RANGES: Record<string, [number, number]> = {
  p1: [0, 50000],
  p2: [50000, 200000],
  p3: [200000, 500000],
  p4: [500000, 1e12],
};
export const PRICE_LABELS: Record<string, string> = {
  p1: 'Até R$ 500',
  p2: 'R$ 500 – 2.000',
  p3: 'R$ 2.000 – 5.000',
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
    cat: one(sp, 'cat'),
    size: list(sp, 'size'),
    brand: list(sp, 'brand'),
    city: list(sp, 'city'),
    price: list(sp, 'price'),
    repair: list(sp, 'repair'),
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
  for (const k of ['cat', 'size', 'brand', 'city', 'price', 'repair', 'sort']) {
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

export function clearHref(sp: SP): string {
  const sort = one(sp, 'sort');
  return toQuery(sort ? { sort } : {});
}

export function hasAnyFilter(sp: SP): boolean {
  const f = parseFilters(sp);
  return !!(f.cat || f.size.length || f.brand.length || f.city.length || f.price.length || f.repair.length);
}
