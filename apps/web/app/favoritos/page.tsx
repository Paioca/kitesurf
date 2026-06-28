// Favoritos do usuário logado.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getNavUser } from '../../lib/session';
import { getFavorites } from '../../lib/browse';
import { color, font } from '../../lib/tokens';
import { ListingCard } from '../../components/ListingCard';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';

export const dynamic = 'force-dynamic';

export default async function Favoritos() {
  const user = await getCurrentUser();
  const navMe = await getNavUser();
  if (!user) redirect('/entrar?next=%2Ffavoritos');
  const items = await getFavorites(user.id);

  const countLabel = items.length === 0 ? 'Nenhum anúncio salvo' : `${items.length} ${items.length === 1 ? 'anúncio salvo' : 'anúncios salvos'}`;

  const empty = (
    <div style={{ textAlign: 'center', padding: '72px 20px', border: '1px dashed #d3ccbd', borderRadius: 18 }}>
      <div style={{ fontSize: 40, color: color.heart, marginBottom: 14, lineHeight: 1 }}>♡</div>
      <div style={{ fontFamily: font.serif, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Nada salvo ainda</div>
      <p style={{ fontSize: 15, color: color.inkMute, margin: '0 auto 24px', maxWidth: 360, lineHeight: 1.5 }}>Toque no coração de um anúncio pra guardar aqui e voltar quando quiser.</p>
      <Link href="/" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '14px 26px', fontFamily: font.sans, fontSize: 15, fontWeight: 700 }}>Explorar equipamento</Link>
    </div>
  );

  const head = (
    <>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Seu radar de vento</div>
      <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, margin: '6px 0 6px', color: color.primary }}>Favoritos</h1>
      <div style={{ fontSize: 15.5, color: color.inkMute, marginBottom: 28 }}>{countLabel}</div>
    </>
  );

  // Sidebar editorial do estado vazio (refresh) — sem "guia de compra" (feature inexistente).
  const REASONS = [
    'Guarde os que te interessam e compare com calma.',
    'Volte quando quiser, sem caçar o anúncio de novo.',
    'Acompanhe o que está disponível no seu spot.',
  ];
  const whyFavoritar = (
    <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.primary, marginBottom: 14 }}>Por que favoritar</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REASONS.map((r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <span style={{ width: 9, height: 9, marginTop: 5, flex: 'none', background: color.primary, transform: 'rotate(45deg)', borderRadius: 2 }} />
            <span style={{ fontSize: 14, color: color.inkSoft, lineHeight: 1.45 }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const temporadaCard = (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, height: 220, background: color.dark }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/favoritos-temporada.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,37,32,0.2), rgba(12,37,32,0.92))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 16, right: 16, width: 16, height: 16, background: color.accent, transform: 'rotate(45deg)', borderRadius: 3, opacity: 0.6, boxShadow: '0 0 22px rgba(217,168,107,0.5)' }} />
      <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.aqua }}>Temporada de ventos</span>
        <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff', marginTop: 2 }}>Cumbuco está soprando</div>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar initialMe={navMe} />
        <div style={{ padding: '20px 18px 96px' }}>
          {head}
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {empty}
              {temporadaCard}
              {whyFavoritar}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={200} />)}
            </div>
          )}
        </div>
        <MobileTabBar active="fav" initialAuthed={!!navMe} />
      </div>

      {/* DESKTOP */}
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px 80px' }}>
          {head}
          {items.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 28, alignItems: 'start' }}>
              {empty}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {whyFavoritar}
                {temporadaCard}
              </aside>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
              {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={180} />)}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
