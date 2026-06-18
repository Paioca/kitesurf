// Home / Busca — Server Component. Anúncios renderizados no servidor (rápido +
// indexável). Filtros na URL. Interação client só no bottom sheet mobile.
import { color, font, heroGradient } from '../lib/tokens';
import { getBrowseData } from '../lib/browse';
import { setHref, clearHref, type SP } from '../lib/filters';
import { ListingCard } from '../components/ListingCard';
import { SiteHeader } from '../components/SiteHeader';
import { MobileAppBar, MobileTabBar } from '../components/MobileChrome';
import { FilterContent } from '../components/browse/FilterContent';
import { FilterSheet } from '../components/browse/FilterSheet';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = searchParams;
  const { items, facets, total, totalAll, filters } = await getBrowseData(sp);
  const activeCount = filters.size.length + filters.brand.length + filters.city.length + filters.price.length + filters.repair.length + (filters.cat ? 1 : 0);
  const countLabel = `${total} ${total === 1 ? 'anúncio' : 'anúncios'} em Cumbuco e região`;
  const empty = totalAll === 0;

  const sorts: [string, string][] = [['recent', 'Recentes'], ['price_asc', 'Menor preço'], ['price_desc', 'Maior preço']];

  return (
    <>
      {/* ---------- MOBILE ---------- */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ paddingBottom: 84 }}>
          <div style={{ position: 'relative', height: 188, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: heroGradient }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.2),rgba(12,37,32,0.75))' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 }}>
              <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 13, color: color.gold, marginBottom: 4 }}>Cumbuco · Ceará</div>
              <h1 style={{ fontSize: 23, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', color: '#fff', lineHeight: 1.05, margin: 0 }}>Equipamento de kite<br />com confiança</h1>
            </div>
          </div>

          <div style={{ padding: '16px 18px 8px', display: 'flex', gap: 9 }}>
            <FilterSheet activeCount={activeCount}>
              <FilterContent sp={sp} facets={facets} filters={filters} />
            </FilterSheet>
          </div>

          {/* chips de categoria (scroll) */}
          {facets.category.length > 0 && (
            <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 18px 6px' }}>
              <a href={clearHref(sp)} style={catChip(!filters.cat)}>Todos</a>
              {facets.category.map((o) => (
                <a key={o.value} href={setHref(sp, 'cat', o.value, true)} style={catChip(filters.cat === o.value)}>{o.label}</a>
              ))}
            </div>
          )}

          <div style={{ padding: '10px 18px 4px', fontSize: 13, color: color.inkFaint }}>{countLabel}</div>

          <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={200} />)}
            {total === 0 && <EmptyState empty={empty} sp={sp} />}
          </div>
        </div>
        <MobileTabBar active="home" />
      </div>

      {/* ---------- DESKTOP ---------- */}
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '34px 32px 80px', display: 'grid', gridTemplateColumns: '262px 1fr', gap: 36, alignItems: 'start' }}>
          <aside style={{ position: 'sticky', top: 96 }}>
            <FilterContent sp={sp} facets={facets} filters={filters} />
          </aside>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Equipamento à venda</h1>
                <div style={{ fontSize: 14, color: color.inkMute }}>{countLabel}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {sorts.map(([key, label]) => (
                  <a key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</a>
                ))}
              </div>
            </div>

            {total === 0 ? (
              <EmptyState empty={empty} sp={sp} big />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
                {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={180} />)}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function EmptyState({ empty, sp, big }: { empty: boolean; sp: SP; big?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: big ? '80px 20px' : '50px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: big ? 19 : 16, color: color.inkFaint2, marginBottom: 14 }}>
        {empty ? 'Ainda não há anúncios por aqui.' : 'Nada com esses filtros.'}
      </div>
      <a href={empty ? '/anunciar' : clearHref(sp)} style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontFamily: font.sans, fontSize: 14, fontWeight: 700 }}>
        {empty ? 'Anunciar o primeiro' : 'Limpar filtros'}
      </a>
    </div>
  );
}

function catChip(on: boolean): React.CSSProperties {
  return { flex: 'none', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.primary : color.surface, color: on ? '#fff' : color.ink, border: `1px solid ${on ? color.primary : color.lineChip}` };
}
function sortBtn(on: boolean): React.CSSProperties {
  return { fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, textDecoration: 'none', background: on ? color.ink : color.surface, color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? color.ink : color.lineChip}` };
}
