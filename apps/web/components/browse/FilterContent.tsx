// Conteúdo de filtros — server, 100% links na URL. Usado no sidebar desktop
// e dentro do bottom sheet mobile. Tamanho + Categoria como chips (os "aha"),
// resto como linhas com contador. Seções sem opção (count 0) não aparecem.
import { color, font, radius } from '../../lib/tokens';
import { clearFiltersHref, setHref, toggleHref, type SP } from '../../lib/filters';
import type { Facets } from '../../lib/browse';
import { SectionLabel } from '../ui';

type Filters = { cat: string; size: string[]; brand: string[]; uf: string[]; city: string[]; price: string[]; repair: string[]; withbar: string[]; cond: string[]; bladder: string[]; mang: string[]; delivery: string[] };
type Locale = 'pt' | 'en';
const COPY = {
  pt: {
    filters: 'Filtros',
    clear: 'Limpar',
    category: 'Categoria',
    kiteSize: 'Tamanho do kite',
    condition: 'Condição',
    bladder: 'Bladder',
    lines: 'Mangueiras',
    brand: 'Marca',
    state: 'Estado',
    city: 'Spot',
    price: 'Preço',
    kiteBar: 'Kite + barra',
    repair: 'Reparo',
    delivery: 'Entrega',
    size: { s1: 'até 7 m²', s2: '7 a 9 m²', s3: '9 a 11 m²', s4: '11 a 13 m²', s5: '13 m² ou +' } as Record<string, string>,
    priceLabel: { p1: 'Até R$ 500', p2: 'R$ 500 a 2.000', p3: 'R$ 2.000 a 5.000', p4: 'Acima de R$ 5.000' } as Record<string, string>,
    conditionLabel: { novo_lacrado: 'Novo, lacrado', novo_10x: 'Pouco usado', semi_otimo: 'Seminovo, em ótimo estado', semi_desgaste: 'Seminovo, com sinais de uso', usado_desgaste: 'Usado, com desgaste visível', novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado' } as Record<string, string>,
    bladderLabel: { zero: 'Sem furo', microfuro_adesivado: 'Microfuro reparado' } as Record<string, string>,
    linesLabel: { original: 'Originais', ja_trocadas: 'Trocadas' } as Record<string, string>,
    boolLabel: { yes: 'Sim', local: 'Retirada no spot', ship: 'Envio disponível' } as Record<string, string>,
  },
  en: {
    filters: 'Filters',
    clear: 'Clear',
    category: 'Category',
    kiteSize: 'Kite size',
    condition: 'Condition',
    bladder: 'Bladder',
    lines: 'Lines',
    brand: 'Brand',
    state: 'State',
    city: 'Spot',
    price: 'Price',
    kiteBar: 'Kite + bar',
    repair: 'Repair',
    delivery: 'Delivery',
    size: { s1: 'up to 7 m²', s2: '7 to 9 m²', s3: '9 to 11 m²', s4: '11 to 13 m²', s5: '13 m²+' } as Record<string, string>,
    priceLabel: { p1: 'Up to R$ 500', p2: 'R$ 500 to 2,000', p3: 'R$ 2,000 to 5,000', p4: 'Above R$ 5,000' } as Record<string, string>,
    conditionLabel: { novo_lacrado: 'New, sealed', novo_10x: 'Lightly used', semi_otimo: 'Pre-owned, great condition', semi_desgaste: 'Pre-owned, signs of use', usado_desgaste: 'Used, visible wear', novo: 'New', seminovo: 'Pre-owned', bom: 'Good condition', usado: 'Used' } as Record<string, string>,
    bladderLabel: { zero: 'No leak', microfuro_adesivado: 'Patched pinhole' } as Record<string, string>,
    linesLabel: { original: 'Original', ja_trocadas: 'Replaced' } as Record<string, string>,
    boolLabel: { yes: 'Yes', local: 'Pickup at spot', ship: 'Shipping available' } as Record<string, string>,
  },
};

export function FilterContent({ sp, facets, filters, inSheet = false, locale = 'pt' }: { sp: SP; facets: Facets; filters: Filters; inSheet?: boolean; locale?: Locale }) {
  const t = COPY[locale];
  // No bottom sheet mobile, todo link carrega fs=1 pra que o sheet reabra após a
  // navegação (selecionar vários filtros sem o sheet fechar a cada toque).
  const h = (href: string) => (inSheet ? href + (href.includes('?') ? '&' : '?') + 'fs=1' : href);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontFamily: font.serif, fontSize: 22, fontWeight: 600, margin: 0 }}>{t.filters}</h2>
        <a href={h(clearFiltersHref(sp))} style={{ fontSize: 13, fontWeight: 600, color: color.primary, textDecoration: 'none' }}>{t.clear}</a>
      </div>

      {facets.category.length > 0 && (
        <Block title={t.category}>
          <Chips>
            {facets.category.map((o) => (
              <ChipLink key={o.value} href={h(setHref(sp, 'cat', o.value, true))} on={filters.cat === o.value} label={o.label} />
            ))}
          </Chips>
        </Block>
      )}

      {facets.size.length > 0 && (
        <Block title={t.kiteSize}>
          <Chips>
            {facets.size.map((o) => (
              <ChipLink key={o.value} href={h(toggleHref(sp, 'size', o.value))} on={filters.size.includes(o.value)} label={t.size[o.value] ?? o.label} />
            ))}
          </Chips>
        </Block>
      )}

      {facets.cond.length > 0 && (
        <Block title={t.condition}>
          {facets.cond.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'cond', o.value))} on={filters.cond.includes(o.value)} label={t.conditionLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.bladder.length > 0 && (
        <Block title={t.bladder}>
          {facets.bladder.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'bladder', o.value))} on={filters.bladder.includes(o.value)} label={t.bladderLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.mang.length > 0 && (
        <Block title={t.lines}>
          {facets.mang.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'mang', o.value))} on={filters.mang.includes(o.value)} label={t.linesLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.brand.length > 0 && (
        <Block title={t.brand}>
          {facets.brand.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'brand', o.value))} on={filters.brand.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.uf.length > 0 && (
        <Block title={t.state}>
          {facets.uf.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'uf', o.value))} on={filters.uf.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.city.length > 0 && (
        <Block title={t.city}>
          {facets.city.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'city', o.value))} on={filters.city.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.price.length > 0 && (
        <Block title={t.price}>
          {facets.price.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'price', o.value))} on={filters.price.includes(o.value)} label={t.priceLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.withbar.length > 0 && (
        <Block title={t.kiteBar}>
          {facets.withbar.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'withbar', o.value))} on={filters.withbar.includes(o.value)} label={t.boolLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.repair.length > 0 && (
        <Block title={t.repair}>
          {facets.repair.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'repair', o.value))} on={filters.repair.includes(o.value)} label={t.boolLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.delivery.length > 0 && (
        <Block title={t.delivery}>
          {facets.delivery.map((o) => (
            <RowLink key={o.value} href={h(toggleHref(sp, 'delivery', o.value))} on={filters.delivery.includes(o.value)} label={t.boolLabel[o.value] ?? o.label} count={o.count} />
          ))}
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${color.line}`, padding: '18px 0' }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{children}</div>
    </div>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>;
}

function ChipLink({ href, on, label }: { href: string; on: boolean; label: string }) {
  return (
    <a href={href} style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: radius.pill, textDecoration: 'none', background: on ? color.primary : color.surface, color: on ? '#fff' : color.ink, border: `1px solid ${on ? color.primary : color.lineChip}` }}>
      {label}
    </a>
  );
}

function RowLink({ href, on, label, count }: { href: string; on: boolean; label: string; count: number }) {
  return (
    <a href={href} style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
      <span style={{ width: 19, height: 19, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? color.primary : color.surface, border: `1.5px solid ${on ? color.primary : '#cbc3b2'}` }}>
        {on && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
      </span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: color.ink }}>{label}</span>
      <span style={{ fontSize: 12.5, color: color.inkFaint3 }}>{count}</span>
    </a>
  );
}
