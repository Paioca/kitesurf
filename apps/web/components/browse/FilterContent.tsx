// Conteúdo de filtros — server, 100% links na URL. Usado no sidebar desktop
// e dentro do bottom sheet mobile. Tamanho + Categoria como chips (os "aha"),
// resto como linhas com contador. Seções sem opção (count 0) não aparecem.
import { color, font, radius } from '../../lib/tokens';
import { clearHref, setHref, toggleHref, type SP } from '../../lib/filters';
import type { Facets } from '../../lib/browse';
import { SectionLabel } from '../ui';

type Filters = { cat: string; size: string[]; brand: string[]; city: string[]; price: string[]; repair: string[] };

export function FilterContent({ sp, facets, filters }: { sp: SP; facets: Facets; filters: Filters }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontFamily: font.serif, fontSize: 22, fontWeight: 600, margin: 0 }}>Filtros</h2>
        <a href={clearHref(sp)} style={{ fontSize: 13, fontWeight: 600, color: color.primary, textDecoration: 'none' }}>Limpar</a>
      </div>

      {facets.category.length > 0 && (
        <Block title="Categoria">
          <Chips>
            {facets.category.map((o) => (
              <ChipLink key={o.value} href={setHref(sp, 'cat', o.value, true)} on={filters.cat === o.value} label={o.label} />
            ))}
          </Chips>
        </Block>
      )}

      {facets.size.length > 0 && (
        <Block title="Tamanho do kite">
          <Chips>
            {facets.size.map((o) => (
              <ChipLink key={o.value} href={toggleHref(sp, 'size', o.value)} on={filters.size.includes(o.value)} label={o.label} />
            ))}
          </Chips>
        </Block>
      )}

      {facets.brand.length > 0 && (
        <Block title="Marca">
          {facets.brand.map((o) => (
            <RowLink key={o.value} href={toggleHref(sp, 'brand', o.value)} on={filters.brand.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.city.length > 0 && (
        <Block title="Cidade">
          {facets.city.map((o) => (
            <RowLink key={o.value} href={toggleHref(sp, 'city', o.value)} on={filters.city.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.price.length > 0 && (
        <Block title="Preço">
          {facets.price.map((o) => (
            <RowLink key={o.value} href={toggleHref(sp, 'price', o.value)} on={filters.price.includes(o.value)} label={o.label} count={o.count} />
          ))}
        </Block>
      )}

      {facets.repair.length > 0 && (
        <Block title="Reparo">
          {facets.repair.map((o) => (
            <RowLink key={o.value} href={toggleHref(sp, 'repair', o.value)} on={filters.repair.includes(o.value)} label={o.label} count={o.count} />
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
