// Home / Busca — Server Component. Anúncios renderizados no servidor (rápido +
// indexável). Filtros na URL. Interação client só no bottom sheet mobile.
import Image from 'next/image';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { color, font } from '../lib/tokens';
import { getBrowseData, type Facets } from '../lib/browse';
import { setHref, toggleHref, clearHref, clearFiltersHref, pageHref, hasAnyFilter, currentHref, type SP } from '../lib/filters';
import { ListingCard } from '../components/ListingCard';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { Diamond, DiamondTrail } from '../components/ui';
import { MobileAppBar, MobileTabBar } from '../components/MobileChrome';
import { getNavUser } from '../lib/session';
import { publicBaseUrl } from '../lib/app-url';
import { HowItWorks } from '../components/HowItWorks';
import { FilterContent } from '../components/browse/FilterContent';
import { FilterSheet } from '../components/browse/FilterSheet';
import { ActiveChips } from '../components/browse/ActiveChips';
import { stateLabel, statePhrasePt } from '../lib/locations';

export const dynamic = 'force-dynamic';

type Locale = 'pt' | 'en';
const HOME_COPY = {
  pt: {
    heroEyebrow: 'Venda com mais contexto',
    heroTitle: 'Anuncie seu kite com menos conversa perdida',
    heroSub: 'Crie um anúncio com fotos, ficha técnica e telefone verificado. O comprador envia pedido de visita ou oferta estruturada, e seu WhatsApp só é liberado quando você aceita.',
    primaryCta: 'Anunciar meu kite',
    secondaryCta: 'Ver kites à venda',
    mobileEyebrow: 'Venda com mais confiança',
    mobileSub: 'Crie um anúncio com fotos, ficha técnica e telefone verificado. Seu WhatsApp só é liberado quando você aceita.',
    browseIntro: 'Quer ver equipamentos à venda?',
    loggedBrowseEyebrow: 'Equipamentos à venda',
    loggedBrowseTitle: 'Escolha pelo que importa',
    quickSize: 'Tamanho',
    quickState: 'Estado',
    quickCity: 'Spot',
    filters: 'Filtros',
    applyFilters: 'Ver anúncios',
    onWind: 'No vento agora',
    browseTitle: 'Equipamentos rodando pela comunidade',
    publicCount: 'Curadoria inicial',
    all: 'Todos',
    typeKites: 'Kites',
    typeKit: 'Kite + barra',
    typeBars: 'Barras',
    sortRecent: 'Mais recentes',
    sortPriceAsc: 'Menor preço',
    sortPriceDesc: 'Maior preço',
    proofVisit: 'Pedido de visita ou oferta estruturada',
    proofWhats: 'WhatsApp liberado só com aceite',
    proofPhone: 'Telefone verificado antes de anunciar',
    proofRep: 'Reputação após negociação confirmada',
    communityEyebrow: 'Cuidado em cada detalhe',
    communityTitle: 'O destino final dos kitesurfistas',
    communityBody: 'A Kitetropos nasceu nas areias de Cumbuco para redefinir o mercado de equipamentos de kitesurf. Unimos a paixão pelo esporte com a curadoria de quem entende cada rajada de vento. Mais que um marketplace, somos o elo de confiança entre quem vive o mar.',
    communityBadge: 'Comunidade',
    communityBadgeLine2: 'Elevada.',
    trustEyebrow: 'Mais contexto antes de negociar',
    trustTitle: 'Negocie com mais confiança',
    trustBody: 'Veja quem está anunciando, entenda o estado do equipamento e converse direto com quem vive o esporte.',
    flowEyebrow: 'Como a negociação acontece',
    flowTitle: 'Do anúncio à conversa',
    flowBody: 'A Kitetropos ajuda você a encontrar, avaliar e iniciar a conversa. Preço, pagamento e entrega ficam combinados diretamente entre comprador e vendedor.',
    howItWorks: 'Como funciona para o vendedor',
    filteredTitle: 'Equipamentos rodando pela comunidade',
    adSingular: 'anúncio',
    adPlural: 'anúncios',
    availableSingular: 'disponível',
    availablePlural: 'disponíveis',
    selectedSpots: 'nos spots selecionados',
    selectedStates: 'nos estados selecionados',
    emptyAll: 'Ainda não há anúncios por aqui.',
    emptyFiltered: 'Nada com esses filtros.',
    firstListing: 'Anunciar o primeiro',
    clearFilters: 'Limpar filtros',
    previous: 'Anterior',
    next: 'Próxima',
    page: 'Página',
    of: 'de',
  },
  en: {
    heroEyebrow: 'Sell with more context',
    heroTitle: 'List your kite with fewer wasted conversations',
    heroSub: 'Create a listing with photos, specs, and verified phone. Buyers send a visit request or structured offer, and your WhatsApp is shared only when you accept.',
    primaryCta: 'List my kite',
    secondaryCta: 'See kites for sale',
    mobileEyebrow: 'Sell with more confidence',
    mobileSub: 'Create a listing with photos, specs, and verified phone. Your WhatsApp is shared only when you accept.',
    browseIntro: 'Want to browse gear for sale?',
    loggedBrowseEyebrow: 'Gear for sale',
    loggedBrowseTitle: 'Choose by what matters',
    quickSize: 'Size',
    quickState: 'State',
    quickCity: 'Spot',
    filters: 'Filters',
    applyFilters: 'See listings',
    onWind: 'On the wind now',
    browseTitle: 'Gear moving through the community',
    publicCount: 'Initial curation',
    all: 'All',
    typeKites: 'Kites',
    typeKit: 'Kite + bar',
    typeBars: 'Bars',
    sortRecent: 'Newest',
    sortPriceAsc: 'Lowest price',
    sortPriceDesc: 'Highest price',
    proofVisit: 'Visit request or structured offer',
    proofWhats: 'WhatsApp shared only after you accept',
    proofPhone: 'Verified phone before listing',
    proofRep: 'Reputation after confirmed deals',
    communityEyebrow: 'Care in every detail',
    communityTitle: 'The final destination for kitesurfers',
    communityBody: 'Kitetropos was born on the sands of Cumbuco to bring more trust and context to used kitesurf gear. More than a marketplace, it connects people who live the sport.',
    communityBadge: 'Community',
    communityBadgeLine2: 'Elevated.',
    trustEyebrow: 'More context before negotiating',
    trustTitle: 'Negotiate with more confidence',
    trustBody: 'See who is listing, understand the gear condition, and start a structured conversation with people who live the sport.',
    flowEyebrow: 'How negotiation works',
    flowTitle: 'From listing to conversation',
    flowBody: 'Kitetropos helps buyers evaluate gear and start the conversation. Price, payment, and delivery are arranged directly between buyer and seller.',
    howItWorks: 'How it works for sellers',
    filteredTitle: 'Gear moving through the community',
    adSingular: 'listing',
    adPlural: 'listings',
    availableSingular: 'available',
    availablePlural: 'available',
    selectedSpots: 'in selected spots',
    selectedStates: 'in selected states',
    emptyAll: 'No listings here yet.',
    emptyFiltered: 'Nothing matches these filters.',
    firstListing: 'Create the first listing',
    clearFilters: 'Clear filters',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
  },
};
type HomeCopy = (typeof HOME_COPY)[Locale];

// OG da home — é a página mais compartilhada; link no WhatsApp/IG vira card.
export const metadata = {
  alternates: { canonical: '/' },
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
  const locale: Locale = (await cookies()).get('kitetropos:locale')?.value === 'en' ? 'en' : 'pt';
  const t = HOME_COPY[locale];
  // A home renderiza AS DUAS árvores (mobile + desktop, alternadas por CSS), cada uma
  // com seu próprio herói. Sem isto, os dois <Image priority> emitiam <link rel=preload>
  // e o viewport baixava também a versão do layout ESCONDIDO (desperdício de 1 fetch de
  // LCP no 4G). Heurística por user-agent dá o priority só ao herói do layout provável;
  // é só uma dica de preload (sem risco de correção se a heurística errar).
  const isMobileUA = /Mobi|Android|iPhone|iPod|iPad/i.test((await headers()).get('user-agent') ?? '');
  const { items, facets, total, totalAll, filters, page, totalPages, viewer } = await getBrowseData(sp);
  const navMe = await getNavUser();
  const authed = !!viewer;
  // JSON-LD de marca (Organization + WebSite) → sinal de identidade no Google. Nonce da CSP.
  const ldNonce = (await headers()).get('x-nonce') ?? undefined;
  const siteBase = publicBaseUrl();
  const siteLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Kitetropos', url: siteBase, logo: `${siteBase}/icon.svg` },
      { '@type': 'WebSite', name: 'Kitetropos', url: siteBase },
    ],
  };
  const activeCount = filters.size.length + filters.brand.length + filters.uf.length + filters.city.length + filters.price.length + filters.repair.length + filters.withbar.length + filters.cond.length + filters.bladder.length + filters.mang.length + filters.delivery.length + (filters.cat ? 1 : 0);
  const countLocation = filters.city.length === 1
    ? locale === 'en' ? ` in ${filters.city[0]}` : ` em ${filters.city[0]}`
    : filters.city.length > 1
      ? ` ${t.selectedSpots}`
      : filters.uf.length === 1
        ? locale === 'en' ? ` in ${stateLabel(filters.uf[0])}` : ` ${statePhrasePt(filters.uf[0])}`
      : filters.uf.length > 1
        ? ` ${t.selectedStates}`
      : ` ${total === 1 ? t.availableSingular : t.availablePlural}`;
  const countLabel = `${total} ${total === 1 ? t.adSingular : t.adPlural}${countLocation}`;
  const empty = totalAll === 0;
  // Sem filtros = landing editorial; com filtros = visão filtrada (sidebar).
  const browseFlag = (Array.isArray(sp.b) ? sp.b[0] : sp.b) === '1';
  const sheetOpen = (Array.isArray(sp.fs) ? sp.fs[0] : sp.fs) === '1'; // bottom sheet persistido
  const landing = !hasAnyFilter(sp) && !browseFlag;
  const sellerLanding = landing && !authed;
  const publicCountLabel = sellerLanding && total > 0 && total < 5 ? t.publicCount : `${total} ${total === 1 ? t.adSingular : t.adPlural}`;
  // Tipos de anúncio (lista fixa Fase 0): Kite · Kite+Barra (kit) · Barra. Sem Acessórios.
  const typeChips = [
    { value: 'kite', label: t.typeKites, count: facets.category.find((c) => c.value === 'kite')?.count ?? 0 },
    { value: 'kit', label: t.typeKit, count: facets.withbar[0]?.count ?? 0 },
    { value: 'barra', label: t.typeBars, count: facets.category.find((c) => c.value === 'barra')?.count ?? 0 },
  ].filter((t) => t.count > 0);

  const sorts: [string, string][] = [['recent', t.sortRecent], ['price_asc', t.sortPriceAsc], ['price_desc', t.sortPriceDesc]];
  const atBrowse = (href: string) => `${href}${href.includes('#') ? '' : '#browse'}`;
  const sortControl = (key: string, label: string, keepBrowse = false) => (
    filters.sort === key
      ? <span key={key} style={sortBtn(true)}>{label}</span>
      : <Link key={key} href={keepBrowse ? atBrowse(setHref(sp, 'sort', key)) : setHref(sp, 'sort', key)} style={sortBtn(false)}>{label}</Link>
  );

  return (
    <>
      <script type="application/ld+json" nonce={ldNonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      {/* ---------- MOBILE ---------- */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar initialMe={navMe} />
        <div style={{ paddingBottom: 84 }}>
          {sellerLanding && (
            <>
              {/* Hero imersivo: primeira visita orientada para anunciar. */}
              <div style={{ position: 'relative', height: 'min(76vh, 520px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <Image src="/hero-beach.jpg" alt="" fill priority={isMobileUA} sizes="430px" style={{ objectFit: 'cover', animation: 'kl-drift 24s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.12) 0%,rgba(12,37,32,0.34) 45%,rgba(12,37,32,0.92) 100%)' }} />
                <div style={{ position: 'relative', padding: '0 20px 40px', animation: 'kl-up 0.7s ease both' }}>
                  <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.aqua, marginBottom: 14 }}>{t.mobileEyebrow}</div>
                  <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,9vw,44px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff', lineHeight: 0.98, margin: 0 }}>{t.heroTitle}</h1>
                  <p style={{ fontSize: 15.5, lineHeight: 1.55, color: '#dce8e1', margin: '18px 0 22px' }}>{t.mobileSub}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Link href="/anunciar" style={{ background: color.accent, color: color.accentInk, borderRadius: 12, padding: '15px 18px', textAlign: 'center', textDecoration: 'none', fontSize: 15, fontWeight: 800 }}>{t.primaryCta}</Link>
                  </div>
                </div>
              </div>

              <SellerProofs mobile t={t} />
            </>
          )}

          {/* Browse estruturado: sem busca solta por texto na home. */}
          <div id="browse" style={{ padding: sellerLanding ? '18px 18px 0' : '24px 18px 0', position: 'relative', zIndex: 3 }}>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.primary, marginBottom: 6 }}>{authed ? t.loggedBrowseEyebrow : t.browseIntro}</div>
            <h1 style={{ fontFamily: font.sans, fontSize: 28, lineHeight: 1, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: color.ink, margin: 0 }}>{authed ? t.loggedBrowseTitle : t.browseTitle}</h1>
          </div>

          {/* Só o TIPO como controle segmentado. Estado/Tamanho/Spot e o resto vivem no
              bottom sheet "Filtros" (FilterContent) — sem duplicar, libera a dobra no mobile. */}
          <MobileTypeTabs sp={sp} typeChips={typeChips} cat={filters.cat} t={t} />

          {/* Filtros (pill discreto) + contagem em linha própria; ordenação sem sobrepor. */}
          <div style={{ padding: '6px 18px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <FilterSheet activeCount={activeCount} total={total} applyHref={currentHref(sp)} initialOpen={sheetOpen} labels={{ trigger: t.filters, apply: t.applyFilters, adSingular: t.adSingular, adPlural: t.adPlural }}>
                <FilterContent sp={sp} facets={facets} filters={filters} inSheet locale={locale} />
              </FilterSheet>
              <span style={{ fontSize: 12.5, color: color.inkFaint, whiteSpace: 'nowrap' }}>{publicCountLabel}</span>
            </div>
            <div className="kl-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingTop: 12 }}>
              {sorts.map(([key, label]) => sortControl(key, label, true))}
            </div>
          </div>

          <div style={{ padding: '4px 18px 0' }}>
            <ActiveChips sp={sp} facets={facets} filters={filters} locale={locale} />
          </div>

          <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={200} />)}
            {total === 0 && <EmptyState empty={empty} sp={sp} t={t} />}
          </div>
          <Pager page={page} totalPages={totalPages} sp={sp} t={t} />
        </div>
        <MobileTabBar active="home" initialAuthed={!!navMe} />
      </div>

      {/* ---------- DESKTOP ---------- */}
      <div className="only-desktop">
        <SiteHeader />
        {sellerLanding ? (
          <>
            <Hero priority={!isMobileUA} t={t} />
            <Community t={t} />
            <section id="browse" style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px,7vw,84px) 32px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 30 }}>
                <div>
                  <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 8 }}>{t.onWind}</div>
                  <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,4.5vw,50px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.5px', margin: 0, lineHeight: 0.98 }}>{t.browseTitle}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sorts.map(([key, label]) => sortControl(key, label, true))}
                </div>
              </div>

              <QuickFilters sp={sp} facets={facets} filters={filters} typeChips={typeChips} t={t} />

              {total === 0 ? (
                <EmptyState empty={empty} sp={sp} t={t} big />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
                  {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={196} />)}
                </div>
              )}
              <Pager page={page} totalPages={totalPages} sp={sp} t={t} />
            </section>
            <Trust t={t} />
            <Flow t={t} />
          </>
        ) : (
          <main style={{ maxWidth: 1320, margin: '0 auto', padding: '34px 32px 80px', display: 'grid', gridTemplateColumns: '262px 1fr', gap: 36, alignItems: 'start' }}>
            <aside style={{ position: 'sticky', top: 96 }}>
              <FilterContent sp={sp} facets={facets} filters={filters} locale={locale} />
            </aside>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 8 }}>{authed ? t.loggedBrowseEyebrow : t.browseIntro}</div>
                  <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>{authed && landing ? t.loggedBrowseTitle : t.filteredTitle}</h1>
                  <div style={{ fontSize: 14, color: color.inkMute }}>{countLabel}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {sorts.map(([key, label]) => sortControl(key, label))}
                </div>
              </div>

              {/* Sem QuickFilters aqui: no desktop a sidebar (FilterContent) já cobre todas as
                  dimensões — os chips inline duplicavam o menu lateral. QuickFilters segue só no
                  mobile (sem sidebar) e na landing pública (layout editorial sem sidebar). */}
              <ActiveChips sp={sp} facets={facets} filters={filters} locale={locale} />

              {total === 0 ? (
                <EmptyState empty={empty} sp={sp} t={t} big />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
                  {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={180} />)}
                </div>
              )}
              <Pager page={page} totalPages={totalPages} sp={sp} t={t} />
            </div>
          </main>
        )}
        <Footer />
      </div>
    </>
  );
}

// ---------- HERO (landing) — vendedor-first ----------
function Hero({ priority = true, t }: { priority?: boolean; t: HomeCopy }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: color.dark }}>
      <Image src="/hero-beach.jpg" alt="" fill priority={priority} sizes="100vw" style={{ objectFit: 'cover', animation: 'kl-drift 24s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,rgba(12,37,32,0.95) 0%,rgba(12,37,32,0.84) 46%,rgba(12,37,32,0.45) 100%)' }} />
      {/* vinheta inferior: garante leitura do form de busca sobre a foto */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(12,37,32,0.45) 0%,rgba(12,37,32,0) 40%)' }} />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,104px) 32px clamp(72px,10vw,112px)' }}>
        <div style={{ maxWidth: 690, animation: 'kl-up 0.7s ease both' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 19, color: color.aqua, marginBottom: 22 }}>{t.heroEyebrow}</div>
          <h1 style={{ fontSize: 'clamp(38px,6vw,62px)', lineHeight: 0.98, fontWeight: 900, letterSpacing: '-1.5px', textTransform: 'uppercase', color: '#fff', margin: '0 0 22px' }}>{t.heroTitle}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: '#dce8e1', margin: '0 0 30px', maxWidth: 640 }}>{t.heroSub}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
            <Link href="/anunciar" className="kl-lift" style={{ background: color.accent, color: color.accentInk, borderRadius: 12, padding: '17px 32px', textDecoration: 'none', fontSize: 17, fontWeight: 900, boxShadow: '0 14px 34px rgba(217,168,107,0.26)' }}>{t.primaryCta}</Link>
            <a href="#browse" style={{ color: '#dce8e1', textDecoration: 'underline', textUnderlineOffset: 5, textDecorationThickness: 1, fontSize: 15, fontWeight: 700 }}>{t.secondaryCta}</a>
          </div>
          <SellerProofs t={t} />
          <div style={{ marginTop: 18 }}>
            <HowItWorks label={t.howItWorks} variant="link" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SellerProofs({ mobile = false, t }: { mobile?: boolean; t: HomeCopy }) {
  const proofs = [
    t.proofVisit,
    t.proofWhats,
    t.proofPhone,
    t.proofRep,
  ];
  if (mobile) {
    return (
      <section style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {proofs.map((p) => (
            <div key={p} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 12, padding: '12px 11px', fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: color.ink }}>
              {p}
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, maxWidth: 650 }}>
      {proofs.map((p) => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#dce8e1', fontSize: 14.5, fontWeight: 700 }}>
          <Diamond size={9} c={color.aqua} r={2} />
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
}

// Controle segmentado de TIPO (Todos / Kites / Kite + barra) — a única "lente" rápida que
// fica na home MOBILE. Estado/Tamanho/Spot e os demais filtros vivem no bottom sheet
// "Filtros" (FilterContent). Rola na horizontal se não couber. Mesmos links de URL do
// filtro de categoria (clearHref para "Todos", setHref('cat') para cada tipo).
function MobileTypeTabs({ sp, typeChips, cat, t }: { sp: SP; typeChips: { value: string; label: string; count: number }[]; cat: string; t: HomeCopy }) {
  if (typeChips.length === 0) return null;
  const href = (value: string) => `${value}#browse`;
  const seg = (on: boolean): React.CSSProperties => ({ flex: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 36, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '8px 16px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.primary : 'transparent', color: on ? '#fff' : color.inkSoft });
  return (
    <div className="kl-scroll" style={{ padding: '14px 18px 2px', overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', gap: 4, background: color.tabTrack, borderRadius: 999, padding: 3 }}>
        <Link href={href(clearHref(sp))} style={seg(!cat)}>{t.all}</Link>
        {typeChips.map((type) => (
          <Link key={type.value} href={href(setHref(sp, 'cat', type.value, true))} style={seg(cat === type.value)}>{type.label}</Link>
        ))}
      </div>
    </div>
  );
}

// Filtros rápidos da LANDING desktop (pública): tipo + estado + tamanho + spot em chips.
// Só usado lá; no mobile a home usa MobileTypeTabs + o sheet, e no desktop logado a
// sidebar (FilterContent) cobre tudo.
function QuickFilters({ sp, facets, filters, typeChips, t }: { sp: SP; facets: Facets; filters: ReturnType<typeof import('../lib/filters').parseFilters>; typeChips: { value: string; label: string; count: number }[]; t: HomeCopy }) {
  const sizeOptions = facets.size.slice(0, 6);
  const stateOptions = facets.uf.slice(0, 4);
  const cityOptions = facets.city.slice(0, 5);
  const href = (value: string) => `${value}${value.includes('#') ? '' : '#browse'}`;
  const scrollStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };

  return (
    <div style={{ padding: '0 0 28px' }}>
      {typeChips.length > 0 && (
        <div style={{ ...scrollStyle, marginBottom: sizeOptions.length || stateOptions.length || cityOptions.length ? 10 : 0 }}>
          <Link href={href(clearHref(sp))} style={catChip(!filters.cat)}>{t.all}</Link>
          {typeChips.map((type) => (
            <Link key={type.value} href={href(setHref(sp, 'cat', type.value, true))} style={catChip(filters.cat === type.value)}>{type.label}</Link>
          ))}
        </div>
      )}

      {stateOptions.length > 0 && (
        <div>
          <div style={quickLabel}>{t.quickState}</div>
          <div style={scrollStyle}>
            {stateOptions.map((o) => (
              <Link key={o.value} href={href(toggleHref(sp, 'uf', o.value))} style={filterChip(filters.uf.includes(o.value))}>{o.label}</Link>
            ))}
          </div>
        </div>
      )}

      {sizeOptions.length > 0 && (
        <div style={{ marginTop: stateOptions.length ? 12 : 0 }}>
          <div style={quickLabel}>{t.quickSize}</div>
          <div style={scrollStyle}>
            {sizeOptions.map((o) => (
              <Link key={o.value} href={href(toggleHref(sp, 'size', o.value))} style={filterChip(filters.size.includes(o.value))}>{localizedFacetLabel(o.value, o.label, t)}</Link>
            ))}
          </div>
        </div>
      )}

      {cityOptions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={quickLabel}>{t.quickCity}</div>
          <div style={scrollStyle}>
            {cityOptions.map((o) => (
              <Link key={o.value} href={href(toggleHref(sp, 'city', o.value))} style={filterChip(filters.city.includes(o.value))}>{o.label}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function localizedFacetLabel(value: string, label: string, t: HomeCopy) {
  if (t !== HOME_COPY.en) return label;
  const map: Record<string, string> = {
    s1: 'up to 7 m²',
    s2: '7 to 9 m²',
    s3: '9 to 11 m²',
    s4: '11 to 13 m²',
    s5: '13 m²+',
  };
  return map[value] ?? label;
}

// ---------- COMUNIDADE (editorial: foto + manifesto) ----------
function Community({ t }: { t: HomeCopy }) {
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
              <div style={{ fontFamily: font.sans, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, color: color.dark }}>{t.communityBadge}<br />{t.communityBadgeLine2}</div>
            </div>
          </div>
          {/* manifesto */}
          <div>
            <div style={{ width: 48, height: 3, background: color.accent, borderRadius: 2, marginBottom: 24 }} />
            <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(28px,3.4vw,40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, color: color.dark, margin: '0 0 22px' }}>{t.communityTitle}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: color.inkSoft, margin: '0 0 24px' }}>{t.communityBody}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: color.primary, fontWeight: 800 }}>
              <Diamond size={11} c={color.primary} r={2} />
              <span style={{ fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t.communityEyebrow}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- TRUST ----------
function Trust({ t }: { t: HomeCopy }) {
  const isEn = t === HOME_COPY.en;
  const pillars = [
    { title: t.proofPhone, desc: isEn ? 'Each rider confirms their phone before listing or negotiating.' : 'Cada rider confirma o telefone antes de anunciar ou negociar.' },
    { title: isEn ? 'More human profile' : 'Perfil mais humano', desc: isEn ? 'Photo, city, and spot help people understand who is on the other side.' : 'Foto, cidade e spot ajudam a entender quem está do outro lado da conversa.' },
    { title: isEn ? 'History after the deal' : 'Histórico depois da venda', desc: isEn ? 'After a confirmed deal, buyer and seller can leave a review.' : 'Depois de uma negociação confirmada, comprador e vendedor podem deixar uma avaliação.' },
    { title: isEn ? 'WhatsApp only when it makes sense' : 'WhatsApp só quando faz sentido', desc: isEn ? 'Contact is shared when there is real interest, avoiding loose conversations.' : 'O contato é liberado quando existe interesse real, evitando conversa solta e perda de tempo.' },
  ];
  return (
    <section id="trust" className="kl-reveal" style={{ background: '#ece3d2' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,9vw,96px) 32px' }}>
        <div className="trust-grid">
          {/* manchete editorial — à esquerda, dominante */}
          <div>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 19, color: color.primary, marginBottom: 16 }}>{t.trustEyebrow}</div>
            <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(38px,5.4vw,62px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.8px', color: color.ink, margin: '0 0 20px', lineHeight: 0.94 }}>{t.trustTitle}</h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: color.inkMute, margin: 0, maxWidth: 420 }}>{t.trustBody}</p>
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
function Flow({ t }: { t: HomeCopy }) {
  const isEn = t === HOME_COPY.en;
  const steps = [
    { n: '1', title: isEn ? 'Find or list' : 'Encontre ou anuncie', desc: isEn ? 'See photos, size, condition, city, and details before reaching out.' : 'Veja fotos, tamanho, condição, cidade e detalhes do equipamento antes de chamar.' },
    { n: '2', title: isEn ? 'Send an offer or visit request' : 'Faça uma oferta ou combine uma visita', desc: isEn ? 'Send a proposal or ask to see the gear up close before deciding.' : 'Envie uma proposta ou combine de ver o equipamento de perto antes de decidir.' },
    { n: '3', title: isEn ? 'Talk on WhatsApp' : 'Conversem direto pelo WhatsApp', desc: isEn ? 'When the seller accepts, contact is shared so you can continue negotiating.' : 'Quando o vendedor aceita o interesse, o contato é liberado para vocês seguirem a negociação.' },
    { n: '4', title: isEn ? 'Close directly' : 'Fechem entre vocês', desc: isEn ? 'If the sale happens, both sides confirm the deal and can leave a review.' : 'Se a venda acontecer, comprador e vendedor confirmam o negócio e podem deixar uma avaliação.' },
  ];
  return (
    <section className="kl-reveal" style={{ background: color.dark, color: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(64px,8vw,96px) 32px' }}>
        <div style={{ maxWidth: 620, margin: '0 0 44px' }}>
          <div style={{ marginBottom: 20 }}><DiamondTrail /></div>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.aqua, marginBottom: 10 }}>{t.flowEyebrow}</div>
          <h2 style={{ fontFamily: font.sans, fontSize: 'clamp(34px,4.8vw,52px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.5px', margin: '0 0 16px', lineHeight: 0.98, color: '#fff' }}>{t.flowTitle}</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#cdded7', margin: 0 }}>{t.flowBody}</p>
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

function EmptyState({ empty, sp, t, big }: { empty: boolean; sp: SP; t: HomeCopy; big?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: big ? '80px 20px' : '50px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: big ? 19 : 16, color: color.inkFaint2, marginBottom: 14 }}>
        {empty ? t.emptyAll : t.emptyFiltered}
      </div>
      <Link href={empty ? '/anunciar' : clearFiltersHref(sp)} style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontFamily: font.sans, fontSize: 14, fontWeight: 700 }}>
        {empty ? t.firstListing : t.clearFilters}
      </Link>
    </div>
  );
}

// Paginação Anterior/Próxima — links na URL (preserva filtros). Só aparece com 2+ páginas.
function Pager({ page, totalPages, sp, t }: { page: number; totalPages: number; sp: SP; t: HomeCopy }) {
  if (totalPages <= 1) return null;
  const base: React.CSSProperties = { fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '10px 18px', borderRadius: 999, textDecoration: 'none', border: `1px solid ${color.lineChip}` };
  const on: React.CSSProperties = { ...base, background: color.surface, color: color.ink };
  const off: React.CSSProperties = { ...base, background: 'transparent', color: color.inkFaint3, pointerEvents: 'none' };
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '26px 18px 8px' }}>
      {page > 1 ? <Link href={pageHref(sp, page - 1)} style={on}>← {t.previous}</Link> : <span style={off}>← {t.previous}</span>}
      <span style={{ fontSize: 13, color: color.inkMute }}>{t.page} {page} {t.of} {totalPages}</span>
      {page < totalPages ? <Link href={pageHref(sp, page + 1)} style={on}>{t.next} →</Link> : <span style={off}>{t.next} →</span>}
    </nav>
  );
}

function catChip(on: boolean): React.CSSProperties {
  return { flex: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.primary : color.surface, color: on ? '#fff' : color.ink, border: `1px solid ${on ? color.primary : color.lineChip}` };
}
const quickLabel: React.CSSProperties = { fontFamily: font.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkFaint, margin: '0 0 7px' };
function filterChip(on: boolean): React.CSSProperties {
  return { flex: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 38, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 12.5, fontWeight: 650, padding: '7px 13px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', background: on ? color.ink : color.surface, color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? color.ink : color.lineChip}` };
}
function sortBtn(on: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box', fontFamily: font.sans, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, textDecoration: 'none', background: on ? color.ink : color.surface, color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? color.ink : color.lineChip}` };
}
