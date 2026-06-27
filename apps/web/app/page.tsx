// Home / Busca — Server Component. Anúncios renderizados no servidor (rápido +
// indexável). Filtros na URL. Interação client só no bottom sheet mobile.
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { color, font } from '../lib/tokens';
import { getBrowseData } from '../lib/browse';
import { setHref, clearHref, clearFiltersHref, pageHref, toggleHref, hasAnyFilter, currentHref, SIZE_RANGES, SIZE_LABELS, SPOTS, type SP } from '../lib/filters';
import { ListingCard } from '../components/ListingCard';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Diamond, DiamondTrail } from '../components/ui';
import { MobileAppBar, MobileTabBar } from '../components/MobileChrome';
import { HowItWorks } from '../components/HowItWorks';
import { FilterContent } from '../components/browse/FilterContent';
import { FilterSheet } from '../components/browse/FilterSheet';
import { ActiveChips } from '../components/browse/ActiveChips';
import { SearchBox } from '../components/browse/SearchBox';

export const dynamic = 'force-dynamic';

// OG da home — é a página mais compartilhada; link no WhatsApp/IG vira card.
export const metadata = {
  title: 'Kitetropos | kite e barra com mais confiança',
  description: 'Marketplace de kite e barra para a comunidade global do kitesurf, com telefone verificado, anúncios estruturados e contato pelo WhatsApp.',
  openGraph: {
    title: 'Kitetropos | kite e barra com mais confiança',
    description: 'Encontre, anuncie e negocie kite e barra com telefone verificado, anúncios estruturados e contato pelo WhatsApp.',
    images: ['/hero-beach.jpg'],
    type: 'website',
  },
};

export default async function Home(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const sp = searchParams;
  // A home renderiza AS DUAS árvores (mobile + desktop, alternadas por CSS), cada uma
  // com seu próprio herói. Sem isto, os dois <Image priority> emitiam <link rel=preload>
  // e o viewport baixava também a versão do layout ESCONDIDO (desperdício de 1 fetch de
  // LCP no 4G). Heurística por user-agent dá o priority só ao herói do layout provável;
  // é só uma dica de preload (sem risco de correção se a heurística errar).
  const isMobileUA = /Mobi|Android|iPhone|iPod|iPad/i.test((await headers()).get('user-agent') ?? '');
  const { items, facets, total, totalAll, filters, page, totalPages } = await getBrowseData(sp);
  const activeCount = filters.size.length + filters.brand.length + filters.city.length + filters.price.length + filters.repair.length + filters.withbar.length + filters.cond.length + filters.bladder.length + filters.mang.length + filters.delivery.length + (filters.cat ? 1 : 0);
  const countLocation = filters.city.length === 1
    ? ` em ${filters.city[0]}`
    : filters.city.length > 1
      ? ' nos spots selecionados'
      : total === 1 ? ' disponível' : ' disponíveis';
  const countLabel = `${total} ${total === 1 ? 'anúncio' : 'anúncios'}${countLocation}`;
  const empty = totalAll === 0;
  // Sem filtros = landing editorial; com filtros = visão filtrada (sidebar).
  const browseFlag = (Array.isArray(sp.b) ? sp.b[0] : sp.b) === '1';
  const sheetOpen = (Array.isArray(sp.fs) ? sp.fs[0] : sp.fs) === '1'; // bottom sheet persistido
  const landing = !hasAnyFilter(sp) && !browseFlag;
  // Tipos de anúncio (lista fixa Fase 0): Kite · Kite+Barra (kit) · Barra. Sem Acessórios.
  const typeChips = [
    { value: 'kite', label: 'Kites', count: facets.category.find((c) => c.value === 'kite')?.count ?? 0 },
    { value: 'kit', label: 'Kite + barra', count: facets.withbar[0]?.count ?? 0 },
    { value: 'barra', label: 'Barras', count: facets.category.find((c) => c.value === 'barra')?.count ?? 0 },
  ].filter((t) => t.count > 0);

  const sorts: [string, string][] = [['recent', 'Mais recentes'], ['price_asc', 'Menor preço'], ['price_desc', 'Maior preço']];

  return (
    <>
      {/* ---------- MOBILE ---------- */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ paddingBottom: 84 }}>
          {/* Hero imersivo (Lifestyle mobile): foto full-bleed, headline gigante, selo gold. */}
          <div style={{ position: 'relative', height: 'min(76vh, 520px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <Image src="/hero-beach.jpg" alt="" fill priority={isMobileUA} sizes="430px" style={{ objectFit: 'cover', animation: 'kl-drift 24s ease-in-out infinite alternate' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.12) 0%,rgba(12,37,32,0.34) 45%,rgba(12,37,32,0.92) 100%)' }} />
            <div style={{ position: 'relative', padding: '0 20px 60px', animation: 'kl-up 0.7s ease both' }}>
              <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.aqua, marginBottom: 14 }}>Nascido em Cumbuco. Aberto para o mundo.</div>
              <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,9vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff', lineHeight: 0.98, margin: 0 }}>O jeito mais leve de comprar e vender kite</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                <span style={{ width: 26, height: 3, background: color.accent, borderRadius: 2, flex: 'none' }} />
                <span style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: color.gold }}>Premium Marketplace</span>
              </div>
            </div>
          </div>

          {/* Busca flutuando sobre a borda do hero (mantém SearchBox e sua lógica). */}
          <div style={{ padding: '0 18px', marginTop: -30, position: 'relative', zIndex: 3 }}>
            <div style={{ borderRadius: 14, boxShadow: '0 10px 28px rgba(12,37,32,0.16)' }}>
              <SearchBox />
            </div>
          </div>

          {/* chips de categoria — linha única limpa (minimalista, igual ao mock) */}
          {typeChips.length > 0 && (
            <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '18px 18px 8px' }}>
              <Link href={clearHref(sp)} style={catChip(!filters.cat)}>Todos</Link>
              {typeChips.map((t) => (
                <Link key={t.value} href={setHref(sp, 'cat', t.value, true)} style={catChip(filters.cat === t.value)}>{t.label}</Link>
              ))}
            </div>
          )}

          {/* Filtros (pill discreto) + contagem · ordenação — uma barra leve. Tamanho mora no sheet. */}
          <div style={{ padding: '4px 18px 6px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
              <FilterSheet activeCount={activeCount} total={total} applyHref={currentHref(sp)} initialOpen={sheetOpen}>
                <FilterContent sp={sp} facets={facets} filters={filters} inSheet />
              </FilterSheet>
              <span style={{ fontSize: 12.5, color: color.inkFaint, whiteSpace: 'nowrap' }}>{total} {total === 1 ? 'anúncio' : 'anúncios'}</span>
            </div>
            <div className="kl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {sorts.map(([key, label]) => (
                <Link key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</Link>
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
            <Hero priority={!isMobileUA} />
            <Community />
            <section id="browse" style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px,7vw,84px) 32px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 30 }}>
                <div>
                  <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 8 }}>No vento agora</div>
                  <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,4.5vw,50px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.5px', margin: 0, lineHeight: 0.98 }}>Equipamentos rodando pela comunidade</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sorts.map(([key, label]) => (
                    <Link key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</Link>
                  ))}
                </div>
              </div>

              {typeChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 36 }}>
                  <Link href={clearHref(sp)} style={catChip(!filters.cat)}>Todos</Link>
                  {typeChips.map((t) => (
                    <Link key={t.value} href={setHref(sp, 'cat', t.value, true)} style={catChip(filters.cat === t.value)}>{t.label}</Link>
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
              <div style={{ marginBottom: 18 }}>
                <SearchBox />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                  <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Equipamentos rodando pela comunidade</h1>
                  <div style={{ fontSize: 14, color: color.inkMute }}>{countLabel}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sorts.map(([key, label]) => (
                    <Link key={key} href={setHref(sp, 'sort', key)} style={sortBtn(filters.sort === key)}>{label}</Link>
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
const SIZE_OPTS = Object.keys(SIZE_RANGES).map((k) => ({ value: k, label: SIZE_LABELS[k] }));
const SPOT_OPTS = SPOTS.map((s) => ({ value: s, label: s }));

function Hero({ priority = true }: { priority?: boolean }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: color.dark }}>
      <Image src="/hero-beach.jpg" alt="" fill priority={priority} sizes="100vw" style={{ objectFit: 'cover', animation: 'kl-drift 24s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,rgba(12,37,32,0.95) 0%,rgba(12,37,32,0.84) 46%,rgba(12,37,32,0.45) 100%)' }} />
      {/* vinheta inferior: garante leitura do form de busca sobre a foto */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(12,37,32,0.45) 0%,rgba(12,37,32,0) 40%)' }} />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,104px) 32px clamp(72px,10vw,112px)' }}>
        <div style={{ maxWidth: 690, animation: 'kl-up 0.7s ease both' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 19, color: color.aqua, marginBottom: 22 }}>Nascido em Cumbuco. Aberto para o mundo.</div>
          <h1 style={{ fontSize: 'clamp(38px,6vw,62px)', lineHeight: 0.98, fontWeight: 900, letterSpacing: '-1.5px', textTransform: 'uppercase', color: '#fff', margin: '0 0 22px' }}>O jeito mais leve de comprar e vender kite</h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: '#dce8e1', margin: '0 0 38px', maxWidth: 610 }}>Equipamentos de kitesurf anunciados por quem vive o esporte. Busque por marca, tamanho, cidade e fale direto com o vendedor pelo WhatsApp.</p>
          <form method="get" action="/" style={{ display: 'flex', alignItems: 'stretch', background: '#fff', borderRadius: 14, padding: 9, boxShadow: '0 18px 50px rgba(0,0,0,0.28)', maxWidth: 690, gap: 4 }}>
            <input type="hidden" name="b" value="1" />{/* mantém na visão de busca mesmo sem filtro */}
            <div style={{ flex: 1.4, minWidth: 0, padding: '8px 14px', borderRight: '1px solid #efeadd' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#9aa49d', marginBottom: 3 }}>Busca</div>
              <input name="q" type="search" placeholder="Busque por marca ou modelo" style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: font.sans, fontSize: 15, fontWeight: 600, color: color.ink, outline: 'none' }} />
            </div>
            <HeroSelect name="cat" label="Tipo" placeholder="Kite, barra ou todos" options={TYPE_OPTS} />
            <HeroSelect name="size" label="Tamanho" placeholder="Qualquer tamanho" options={SIZE_OPTS} accent />
            <HeroSelect name="city" label="Cidade" placeholder="Todas as cidades" options={SPOT_OPTS} last />
            <button type="submit" className="kl-lift" style={{ background: color.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '0 30px', fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>Buscar equipamentos</button>
          </form>
          <div style={{ marginTop: 22 }}>
            <HowItWorks />
          </div>
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

// ---------- COMUNIDADE (editorial: foto + manifesto) ----------
function Community() {
  return (
    <section style={{ background: '#fff', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'clamp(56px,8vw,96px) 32px' }}>
        <div className="community-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 'clamp(40px,6vw,84px)', alignItems: 'center' }}>
          {/* foto + selo dourado flutuante */}
          <div style={{ position: 'relative' }}>
            <div style={{ height: 'clamp(300px,38vw,450px)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(20,72,62,0.20)' }}>
              <div style={{ width: '100%', height: '100%', backgroundImage: 'url("/hero-beach.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            </div>
            <div className="only-desktop" style={{ position: 'absolute', bottom: -24, right: -24, background: color.gold, padding: 'clamp(20px,2.4vw,36px)', borderRadius: 16, boxShadow: '0 16px 36px rgba(20,72,62,0.22)' }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', gap: 5, alignItems: 'center', marginBottom: 12 }}>
                <Diamond size={6} c={color.dark} r={1} />
                <Diamond size={8} c={color.dark} r={1} />
                <Diamond size={10} c={color.dark} r={1} />
              </span>
              <div style={{ fontFamily: font.sans, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, color: color.dark }}>Comunidade<br />Elevada.</div>
            </div>
          </div>
          {/* manifesto */}
          <div>
            <div style={{ width: 48, height: 3, background: color.accent, borderRadius: 2, marginBottom: 24 }} />
            <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(28px,3.4vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, color: color.dark, margin: '0 0 22px' }}>O destino final dos kitesurfistas</h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: color.inkSoft, margin: '0 0 24px' }}>A Kitetropos nasceu nas areias de Cumbuco para redefinir o mercado de equipamentos de kitesurf. Unimos a paixão pelo esporte com a curadoria de quem entende cada rajada de vento. Mais que um marketplace, somos o elo de confiança entre quem vive o mar.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: color.primary, fontWeight: 800 }}>
              <Diamond size={11} c={color.primary} r={2} />
              <span style={{ fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cuidado em cada detalhe</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- TRUST ----------
function Trust() {
  const pillars = [
    { title: 'Número verificado', desc: 'Cada rider confirma o telefone antes de anunciar ou negociar.' },
    { title: 'Perfil mais humano', desc: 'Foto, cidade e spot ajudam a entender quem está do outro lado da conversa.' },
    { title: 'Histórico depois da venda', desc: 'Depois de uma negociação confirmada, comprador e vendedor podem deixar uma avaliação.' },
    { title: 'WhatsApp só quando faz sentido', desc: 'O contato é liberado quando existe interesse real, evitando conversa solta e perda de tempo.' },
  ];
  return (
    <section id="trust" className="kl-reveal" style={{ background: '#ece3d2' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,96px) 32px' }}>
        <div className="trust-grid">
          {/* manchete editorial — à esquerda, dominante */}
          <div>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 19, color: color.primary, marginBottom: 16 }}>Mais contexto antes de negociar</div>
            <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(38px,5.4vw,62px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.8px', color: color.ink, margin: '0 0 20px', lineHeight: 0.94 }}>Negocie com mais confiança</h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: color.inkMute, margin: 0, maxWidth: 420 }}>Veja quem está anunciando, entenda o estado do equipamento e converse direto com quem vive o esporte.</p>
          </div>
          {/* pilares — grade 2×2 à direita, alinhados à esquerda, losango como bullet */}
          <div className="trust-pillars">
            {pillars.map((p) => (
              <div key={p.title}>
                <Diamond size={13} c={color.primary} r={2} />
                <div style={{ fontFamily: font.serif, fontSize: 20, fontWeight: 600, color: color.ink, margin: '12px 0 8px', letterSpacing: '-0.2px' }}>{p.title}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#7c857c', margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- COMO FUNCIONA ----------
function Flow() {
  const steps = [
    { n: '1', title: 'Encontre ou anuncie', desc: 'Veja fotos, tamanho, condição, cidade e detalhes do equipamento antes de chamar.' },
    { n: '2', title: 'Faça uma oferta ou combine uma visita', desc: 'Envie uma proposta ou combine de ver o equipamento de perto antes de decidir.' },
    { n: '3', title: 'Conversem direto pelo WhatsApp', desc: 'Quando o vendedor aceita o interesse, o contato é liberado para vocês seguirem a negociação.' },
    { n: '4', title: 'Fechem entre vocês', desc: 'Se a venda acontecer, comprador e vendedor confirmam o negócio e podem deixar uma avaliação.' },
  ];
  return (
    <section className="kl-reveal" style={{ background: color.dark, color: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,8vw,96px) 32px' }}>
        <div style={{ maxWidth: 620, margin: '0 0 44px' }}>
          <div style={{ marginBottom: 20 }}><DiamondTrail /></div>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.aqua, marginBottom: 10 }}>Como a negociação acontece</div>
          <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,4.8vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.5px', margin: '0 0 16px', lineHeight: 0.98, color: '#fff' }}>Do anúncio à conversa</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#cdded7', margin: 0 }}>A Kitetropos ajuda você a encontrar, avaliar e iniciar a conversa. Preço, pagamento e entrega ficam combinados diretamente entre comprador e vendedor.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {steps.map((f) => (
            <div key={f.n} style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: color.aqua, color: color.dark, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{f.n}</div>
                <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.14)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.2px', color: '#fff' }}>{f.title}</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#9fb6ab', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
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
      <Link href={empty ? '/anunciar' : clearFiltersHref(sp)} style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontFamily: font.sans, fontSize: 14, fontWeight: 700 }}>
        {empty ? 'Anunciar o primeiro' : 'Limpar filtros'}
      </Link>
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
      {page > 1 ? <Link href={pageHref(sp, page - 1)} style={on}>← Anterior</Link> : <span style={off}>← Anterior</span>}
      <span style={{ fontSize: 13, color: color.inkMute }}>Página {page} de {totalPages}</span>
      {page < totalPages ? <Link href={pageHref(sp, page + 1)} style={on}>Próxima →</Link> : <span style={off}>Próxima →</span>}
    </nav>
  );
}

function catChip(on: boolean): React.CSSProperties {
  return { flex: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.primary : color.surface, color: on ? '#fff' : color.ink, border: `1px solid ${on ? color.primary : color.lineChip}` };
}
function sortBtn(on: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, textDecoration: 'none', background: on ? color.ink : color.surface, color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? color.ink : color.lineChip}` };
}
