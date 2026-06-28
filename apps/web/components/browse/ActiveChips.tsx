// Faixa de filtros ativos — pílulas removíveis acima do grid (handoff v2).
// Cada pílula leva ao href que desliga aquele valor; "Limpar tudo" zera (preserva sort).
import { color, font } from '../../lib/tokens';
import { toggleHref, setHref, clearFiltersHref, PRICE_LABELS, SIZE_LABELS, CAT_LABEL, type SP } from '../../lib/filters';
import type { Facets, Facet } from '../../lib/browse';

type Filters = { cat: string; size: string[]; brand: string[]; uf: string[]; city: string[]; price: string[]; repair: string[]; withbar: string[]; cond: string[]; bladder: string[]; mang: string[]; delivery: string[] };
type Locale = 'pt' | 'en';
const COPY = {
  pt: {
    remove: 'Remover filtro',
    clear: 'Limpar filtros',
    cat: CAT_LABEL,
    size: SIZE_LABELS,
    price: PRICE_LABELS,
  },
  en: {
    remove: 'Remove filter',
    clear: 'Clear filters',
    cat: { kite: 'Kite', barra: 'Bar', kit: 'Kite + bar' },
    size: { s1: 'up to 7 m²', s2: '7 to 9 m²', s3: '9 to 11 m²', s4: '11 to 13 m²', s5: '13 m²+' },
    price: { p1: 'Up to R$ 500', p2: 'R$ 500 to 2,000', p3: 'R$ 2,000 to 5,000', p4: 'Above R$ 5,000' },
  },
};

// chave do filtro (multi) → chave da faceta (idênticas, exceto cat→category)
const MULTI: [keyof Filters, keyof Facets][] = [
  ['size', 'size'], ['cond', 'cond'], ['bladder', 'bladder'], ['mang', 'mang'],
  ['brand', 'brand'], ['uf', 'uf'], ['city', 'city'], ['price', 'price'], ['withbar', 'withbar'],
  ['repair', 'repair'], ['delivery', 'delivery'],
];

export function ActiveChips({ sp, facets, filters, locale = 'pt' }: { sp: SP; facets: Facets; filters: Filters; locale?: Locale }) {
  const t = COPY[locale];
  const labelFor = (facetKey: keyof Facets, value: string): string => {
    if (facetKey === 'price') return (t.price as Record<string, string>)[value] ?? value;
    if (facetKey === 'size') return (t.size as Record<string, string>)[value] ?? value;
    const opt = (facets[facetKey] as Facet[]).find((o) => o.value === value);
    return opt?.label ?? value;
  };

  const chips: { key: string; label: string; href: string }[] = [];
  if (filters.cat) chips.push({ key: `cat-${filters.cat}`, label: (t.cat as Record<string, string>)[filters.cat] ?? labelFor('category', filters.cat), href: setHref(sp, 'cat', filters.cat, true) });
  for (const [fk, facetKey] of MULTI) {
    for (const v of filters[fk]) chips.push({ key: `${fk}-${v}`, label: labelFor(facetKey, v), href: toggleHref(sp, fk, v) });
  }
  if (chips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      {chips.map((c) => (
        <a key={c.key} href={c.href} aria-label={`${t.remove} ${c.label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '7px 9px 7px 13px', borderRadius: 999, textDecoration: 'none', background: color.ink, color: '#fff' }}>
          {c.label}
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 12, lineHeight: 1 }}>×</span>
        </a>
      ))}
      <a href={clearFiltersHref(sp)} style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 700, color: color.primary, textDecoration: 'none', padding: '7px 13px', border: `1px solid ${color.lineChip}`, borderRadius: 999 }}>{t.clear}</a>
    </div>
  );
}
