// Home / Busca — Server Component. Anúncios renderizados no servidor (rápido +
// indexável). Filtros na URL. Interação client só no bottom sheet mobile.
import { color, font } from '../lib/tokens';
import { getBrowseData } from '../lib/browse';
import { setHref, clearHref, pageHref, toggleHref, hasAnyFilter, SIZES, SPOTS, type SP } from '../lib/filters';
import { ListingCard } from '../components/ListingCard';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Diamond } from '../components/ui';
import { MobileAppBar, MobileTabBar } from '../components/MobileChrome';
import { FilterContent } from '../components/browse/FilterContent';
import { FilterSheet } from '../components/browse/FilterSheet';
import { ActiveChips } from '../components/browse/ActiveChips';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = searchParams;
  const { items, facets, total, totalAll, filters, page, totalPages } = await getBrowseData(sp);
  const activeCount = filters.size.length + filters.brand.length + filters.city.length + filters.price.length + filters.repair.length + filters.withbar.length + filters.cond.length + filters.bladder.length + filters.mang.length + filters.delivery.length + (filters.cat ? 1 : 0);
  const countLabel = `${total} ${total === 1 ? 'anúncio' : 'anúncios'} em Cumbuco e região`;
  const empty = totalAll === 0;
  // Sem filtros = landing editorial; com filtros = visão filtrada (sidebar).
  const landing = !hasAnyFilter(sp);
  // Tipos de anúncio (lista fixa Fase 0): Kite · Kite+Barra (kit) · Barra. Sem Acessórios.
  const typeChips = [
    { value: 'kite', label: 'Kite', count: facets.category.find((c) => c.value === 'kite')?.count ?? 0 },
    { value: 'kit', label: 'Kite + Barra', count: facets.withbar[0]?.count ?? 0 },
    { value: 'barra', label: 'Barra', count: facets.category.find((c) => c.value === 'barra')?.count ?? 0 },
  ].filter((t) => t.count > 0);

  const sorts: [string, string][] = [['recent', 'Recentes'], ['price_asc', 'Menor preço'], ['price_desc', 'Maior preço']];

  return (
    <>
      {/* ---------- MOBILE ---------- */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ paddingBottom: 84 }}>
          <div style={{ position: 'relative', height: 188, overflow: 'hidden' }}>
            <img src="/hero-beach.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.25),rgba(12,37,32,0.78))' }} />
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
          {typeChips.length > 0 && (
            <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 18px 6px' }}>
              <a href={clearHref(sp)} style={catChip(!filters.cat)}>Todos</a>
              {typeChips.map((t) => (
                <a key={t.value} href={setHref(sp, 'cat', t.value, true)} style={catChip(filters.cat === t.value)}>{t.label}</a>
              ))}
            </div>
          )}

          {/* chips de tamanho on-page (o filtro-assinatura, antes só no sheet) */}
          {facets.size.length > 0 && (
            <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 18px 2px' }}>
              {facets.size.map((o) => (
                <a key={o.value} href={toggleHref(sp, 'size', o.value)} style={catChip(filters.size.includes(o.value))}>{o.label}</a>
              ))}
            </div>
          )}

          {/* contagem + ordenação (antes só no desktop) */}
          <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, color: color.inkFaint, flex: 'none' }}>{total} {total === 1 ? 'anúncio' : 'anúncios'}</span>
            <div className="kl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {sorts.map(([key, label]) => (
                <a key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</a>
              ))}
            </div>
          </div>

          <div style={{ padding: '4px 18px 0' }}>
            <ActiveChips sp={sp} facets={facets} filters={filters} />
          </div>

          <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={200} />)}
            {total === 0 && <EmptyState empty={empty} sp={sp} />}
          </div>
          <Pager page={page} totalPages={totalPages} sp={sp} />
        </div>
        <MobileTabBar active="home" />
      </div>

      {/* ---------- DESKTOP ---------- */}
      <div className="only-desktop">
        <SiteHeader />
        {landing ? (
          <>
            <Hero />
            <section id="browse" style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px,7vw,84px) 32px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 30 }}>
                <div>
                  <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 8 }}>À venda agora, em Cumbuco</div>
                  <h2 style={{ fontFamily: font.serif, fontSize: 44, fontWeight: 600, letterSpacing: '-0.5px', margin: 0, lineHeight: 1.02 }}>Equipamento à venda</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sorts.map(([key, label]) => (
                    <a key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</a>
                  ))}
                </div>
              </div>

              {typeChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 36 }}>
                  <a href={clearHref(sp)} style={catChip(!filters.cat)}>Todos <span style={{ opacity: 0.5, fontWeight: 500 }}>{totalAll}</span></a>
                  {typeChips.map((t) => (
                    <a key={t.value} href={setHref(sp, 'cat', t.value, true)} style={catChip(filters.cat === t.value)}>{t.label} <span style={{ opacity: 0.5, fontWeight: 500 }}>{t.count}</span></a>
                  ))}
                </div>
              )}

              {total === 0 ? (
                <EmptyState empty={empty} sp={sp} big />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
                  {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={196} />)}
                </div>
              )}
              <Pager page={page} totalPages={totalPages} sp={sp} />
            </section>
            <Trust />
            <Flow />
          </>
        ) : (
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

              <ActiveChips sp={sp} facets={facets} filters={filters} />

              {total === 0 ? (
                <EmptyState empty={empty} sp={sp} big />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
                  {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={180} />)}
                </div>
              )}
              <Pager page={page} totalPages={totalPages} sp={sp} />
            </div>
          </main>
        )}
        <Footer />
      </div>
    </>
  );
}

// ---------- HERO (landing) — busca estruturada (form GET → filtra "/") ----------
// Busca-builder: oferece a taxonomia COMPLETA (não só o que existe no banco).
const TYPE_OPTS = [{ value: 'kite', label: 'Kite' }, { value: 'kit', label: 'Kite + Barra' }, { value: 'barra', label: 'Barra' }];
const SIZE_OPTS = SIZES.map((s) => ({ value: s, label: `${s} m²` }));
const SPOT_OPTS = SPOTS.map((s) => ({ value: s, label: s }));

function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: color.dark }}>
      <img src="/hero-beach.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(95deg,rgba(12,37,32,0.92) 0%,rgba(12,37,32,0.66) 42%,rgba(12,37,32,0.12) 100%)' }} />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,104px) 32px clamp(72px,10vw,112px)' }}>
        <div style={{ maxWidth: 690 }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 19, color: color.gold, marginBottom: 22 }}>Cumbuco · Ceará · o hub do kite no Brasil</div>
          <h1 style={{ fontSize: 'clamp(38px,6vw,62px)', lineHeight: 0.98, fontWeight: 900, letterSpacing: '-1.5px', textTransform: 'uppercase', color: '#fff', margin: '0 0 22px' }}>Equipamento de kite com confiança de verdade</h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: '#dce8e1', margin: '0 0 38px', maxWidth: 520 }}>Compre e venda kite e barra sem medo do golpe. Telefone verificado, reputação real e contato direto — sem intermediário e sem chat de spam.</p>
          <form method="get" action="/" style={{ display: 'flex', alignItems: 'stretch', background: '#fff', borderRadius: 14, padding: 9, boxShadow: '0 18px 50px rgba(0,0,0,0.28)', maxWidth: 690, gap: 4 }}>
            <HeroSelect name="cat" label="Tipo" placeholder="Todos" options={TYPE_OPTS} />
            <HeroSelect name="size" label="Tamanho" placeholder="Qualquer" options={SIZE_OPTS} accent />
            <HeroSelect name="city" label="Spot" placeholder="Todos" options={SPOT_OPTS} last />
            <button type="submit" style={{ background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '0 30px', fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>Buscar</button>
          </form>
        </div>
      </div>
    </section>
  );
}

function HeroSelect({ name, label, placeholder, options, accent, last }: { name: string; label: string; placeholder: string; options: { value: string; label: string }[]; accent?: boolean; last?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', padding: '8px 14px', borderRight: last ? 'none' : '1px solid #efeadd', background: accent ? color.chipSoftBg : undefined, borderRadius: accent ? 8 : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        {accent && <Diamond size={7} c={color.primary} />}
        <span style={{ fontSize: 11, fontWeight: accent ? 700 : 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: accent ? color.primary : '#9aa49d' }}>{label}</span>
      </div>
      <select name={name} defaultValue="" className="hero-select" style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: font.sans, fontSize: 15, fontWeight: accent ? 700 : 600, color: color.ink, cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ---------- TRUST ----------
function Trust() {
  const pillars = [
    { title: 'Telefone verificado', desc: 'Um número, uma conta. Verificação por código (OTP).' },
    { title: 'Instagram conectado', desc: 'A comunidade vive no IG. Um feed de kite de anos passa confiança de verdade.' },
    { title: 'Reviews reais', desc: 'Só quem fechou negócio avalia. Reputação que não dá pra inflar.' },
    { title: 'Contato sem spam', desc: 'Oferta e visita têm passo de ciência. Proposta falsa leva a bloqueio.' },
  ];
  return (
    <section id="trust" style={{ background: '#ece3d2' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,96px) 32px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto 60px', textAlign: 'center' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 14 }}>Por que é tranquilo</div>
          <h2 style={{ fontFamily: font.serif, fontSize: 'clamp(32px,4.5vw,46px)', fontWeight: 600, letterSpacing: '-0.5px', color: color.ink, margin: '0 0 18px', lineHeight: 1.04 }}>Compre sem medo do golpe</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: color.inkMute, margin: 0 }}>Identidade verificada, contato estruturado e reputação que não dá pra inflar. Golpista não circula por aqui.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 40 }}>
          {pillars.map((p) => (
            <div key={p.title} style={{ textAlign: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, background: '#fff', border: '1px solid #ddd2bd', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Diamond size={13} c={color.primary} r={2} /></div>
              <div style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, color: color.ink, marginBottom: 10, letterSpacing: '-0.2px' }}>{p.title}</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#7c857c', margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- COMO FUNCIONA ----------
function Flow() {
  const steps = [
    { n: '1', title: 'Anuncie ou ache', desc: 'Ficha estruturada com tamanho e condição. A busca por tamanho funciona de verdade.' },
    { n: '2', title: 'Oferta ou visita', desc: 'Mande uma oferta de valor ou agende uma visita pra testar no spot.' },
    { n: '3', title: 'Fechem no WhatsApp', desc: 'O vendedor recebe seu contato por SMS. Combinam pagamento e entrega direto.' },
    { n: '4', title: 'Avaliem', desc: 'Negócio concluído vira reputação. Os dois confirmam e a review fica pública.' },
  ];
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,8vw,90px) 32px' }}>
      <div style={{ maxWidth: 600, margin: '0 0 40px' }}>
        <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>Como funciona</div>
        <h2 style={{ fontFamily: font.serif, fontSize: 'clamp(30px,4.2vw,44px)', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.02 }}>Do anúncio ao negócio fechado</h2>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: color.inkMute, margin: 0 }}>Sem pagamento na plataforma e sem chat livre. O contato é estruturado: oferta ou visita, e o resto rola no WhatsApp.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
        {steps.map((f) => (
          <div key={f.n} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: color.primary, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{f.n}</div>
              <div style={{ flex: 1, height: 2, background: '#eee7d7' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.2px' }}>{f.title}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#7c857c', margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
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

// Paginação Anterior/Próxima — links na URL (preserva filtros). Só aparece com 2+ páginas.
function Pager({ page, totalPages, sp }: { page: number; totalPages: number; sp: SP }) {
  if (totalPages <= 1) return null;
  const base: React.CSSProperties = { fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '10px 18px', borderRadius: 999, textDecoration: 'none', border: `1px solid ${color.lineChip}` };
  const on: React.CSSProperties = { ...base, background: color.surface, color: color.ink };
  const off: React.CSSProperties = { ...base, background: 'transparent', color: color.inkFaint3, pointerEvents: 'none' };
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '26px 18px 8px' }}>
      {page > 1 ? <a href={pageHref(sp, page - 1)} style={on}>← Anterior</a> : <span style={off}>← Anterior</span>}
      <span style={{ fontSize: 13, color: color.inkMute }}>Página {page} de {totalPages}</span>
      {page < totalPages ? <a href={pageHref(sp, page + 1)} style={on}>Próxima →</a> : <span style={off}>Próxima →</span>}
    </nav>
  );
}

function catChip(on: boolean): React.CSSProperties {
  return { flex: 'none', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.primary : color.surface, color: on ? '#fff' : color.ink, border: `1px solid ${on ? color.primary : color.lineChip}` };
}
function sortBtn(on: boolean): React.CSSProperties {
  return { fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, textDecoration: 'none', background: on ? color.ink : color.surface, color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? color.ink : color.lineChip}` };
}
