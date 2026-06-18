'use client';

// Estado + dados compartilhados entre a home mobile e a desktop.
// Busca anúncios reais da API e faz a filtragem facetada client-side.
import { useEffect, useMemo, useState } from 'react';
import { API, formatBRL } from './api';

export type Raw = {
  id: string;
  brand: string;
  model: string;
  year: number | '';
  price: string;
  priceNum: number;
  cat: string;
  ship: boolean;
  city: string;
  sizeM2: string | null;
  sizeLabel: string;
  repair: boolean;
  furos: boolean;
  photo?: string;
  ph: string;
};

export const PRICE_RANGES: Record<string, [number, number]> = {
  p1: [0, 500],
  p2: [500, 2000],
  p3: [2000, 5000],
  p4: [5000, 1e9],
};
export const PRICE_LABELS: Record<string, string> = {
  p1: 'Até R$ 500',
  p2: 'R$ 500 – 2.000',
  p3: 'R$ 2.000 – 5.000',
  p4: 'Acima de R$ 5.000',
};

function mapListing(l: any): Raw {
  const a = l.attributes ?? {};
  const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
  const sizeLabel = sizeM2
    ? `${sizeM2} m²`
    : a.harness_size || a.bar_size || a.length_cm || l.category?.namePt || '—';
  return {
    id: l.id,
    brand: l.brand?.name ?? '',
    model: l.model?.name ?? l.title,
    year: l.year ?? '',
    price: formatBRL(l.price),
    priceNum: l.price / 100,
    cat: l.category?.namePt ?? '',
    ship: !!l.shippable,
    city: l.city,
    sizeM2,
    sizeLabel: String(sizeLabel),
    repair: Number(a.repairs_count ?? 0) > 0,
    furos: a.micro_furo === true,
    photo: l.images?.[0]?.url,
    ph: l.category?.namePt ? `${l.category.namePt}${sizeM2 ? ` · ${sizeM2} m²` : ''}` : 'Anúncio',
  };
}

export function useBrowse() {
  const [raw, setRaw] = useState<Raw[]>([]);
  const [cats, setCats] = useState<string[]>(['Todos']);
  const [cat, setCat] = useState('Todos');
  const [size, setSize] = useState<string[]>([]);
  const [brand, setBrand] = useState<string[]>([]);
  const [city, setCity] = useState<string[]>([]);
  const [repair, setRepair] = useState<string[]>([]);
  const [furos, setFuros] = useState<string[]>([]);
  const [price, setPrice] = useState<string[]>([]);
  const [sort, setSort] = useState<'recent' | 'priceAsc' | 'priceDesc'>('recent');
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/listings?page=1`)
      .then((r) => r.json())
      .then((d) => setRaw((d.items ?? []).map(mapListing)))
      .catch(() => {});
    fetch(`${API}/api/catalog/categories`)
      .then((r) => r.json())
      .then((cs: any[]) => setCats(['Todos', ...cs.map((c) => c.namePt)]))
      .catch(() => {});
    // Sessão via cookie httpOnly — enviado automaticamente (mesma origem).
    fetch(`${API}/api/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && u.name && setMe({ name: u.name }))
      .catch(() => {});
  }, []);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) =>
    setter((arr) => (arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]));

  const items = useMemo(() => {
    let out = raw.filter((it) => {
      if (cat !== 'Todos' && it.cat !== cat) return false;
      if (size.length && !(it.sizeM2 && size.includes(it.sizeM2))) return false;
      if (brand.length && !brand.includes(it.brand)) return false;
      if (city.length && !city.includes(it.city)) return false;
      if (repair.length && !repair.includes(it.repair ? 'rep' : 'norep')) return false;
      if (furos.length && !furos.includes(it.furos ? 'fur' : 'nofur')) return false;
      if (price.length) {
        const ok = price.some((k) => {
          const r = PRICE_RANGES[k];
          return it.priceNum >= r[0] && it.priceNum < r[1];
        });
        if (!ok) return false;
      }
      return true;
    });
    if (sort === 'priceAsc') out = out.slice().sort((a, b) => a.priceNum - b.priceNum);
    else if (sort === 'priceDesc') out = out.slice().sort((a, b) => b.priceNum - a.priceNum);
    return out;
  }, [raw, cat, size, brand, city, repair, furos, price, sort]);

  // contagem por opção (sobre o conjunto todo, como no protótipo)
  const count = (group: string, key: string) =>
    raw.filter((r) => {
      if (group === 'cat') return r.cat === key;
      if (group === 'size') return r.sizeM2 === key;
      if (group === 'brand') return r.brand === key;
      if (group === 'city') return r.city === key;
      if (group === 'repair') return (r.repair ? 'rep' : 'norep') === key;
      if (group === 'price') {
        const rg = PRICE_RANGES[key];
        return r.priceNum >= rg[0] && r.priceNum < rg[1];
      }
      if (group === 'delivery') return (r.ship ? 'ship' : 'local') === key;
      return false;
    }).length;

  const uniq = (vals: (string | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v)));

  const filterCount =
    size.length + brand.length + city.length + repair.length + furos.length + price.length;

  const clearAll = () => {
    setSize([]);
    setBrand([]);
    setCity([]);
    setRepair([]);
    setFuros([]);
    setPrice([]);
  };

  return {
    raw,
    cats,
    cat,
    setCat,
    size,
    setSize,
    brand,
    setBrand,
    city,
    setCity,
    repair,
    setRepair,
    furos,
    setFuros,
    price,
    setPrice,
    sort,
    setSort,
    favs,
    setFavs,
    sheet,
    setSheet,
    me,
    toggle,
    items,
    count,
    uniq,
    filterCount,
    clearAll,
    // facetas dinâmicas pro desktop
    brandOpts: uniq(raw.map((r) => r.brand)).sort(),
    cityOpts: uniq(raw.map((r) => r.city)).sort(),
    sizeOpts: uniq(raw.map((r) => r.sizeM2)).sort((a, b) => Number(a) - Number(b)),
  };
}

export type Browse = ReturnType<typeof useBrowse>;
