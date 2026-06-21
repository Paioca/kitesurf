// Favoritos do usuário logado.
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/session';
import { getFavorites } from '../../lib/browse';
import { color, font } from '../../lib/tokens';
import { ListingCard } from '../../components/ListingCard';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';

export const dynamic = 'force-dynamic';

export default async function Favoritos() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Ffavoritos');
  const items = await getFavorites(user.id);

  const countLabel = items.length === 0 ? 'Nenhum anúncio salvo' : `${items.length} ${items.length === 1 ? 'anúncio salvo' : 'anúncios salvos'}`;

  const empty = (
    <div style={{ textAlign: 'center', padding: '72px 20px', border: '1px dashed #d3ccbd', borderRadius: 18 }}>
      <div style={{ fontSize: 40, color: color.heart, marginBottom: 14, lineHeight: 1 }}>♡</div>
      <div style={{ fontFamily: font.serif, fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Nada salvo ainda</div>
      <p style={{ fontSize: 15, color: color.inkMute, margin: '0 auto 24px', maxWidth: 360, lineHeight: 1.5 }}>Toque no coração de um anúncio pra guardar aqui e voltar quando quiser.</p>
      <a href="/" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '14px 26px', fontFamily: font.sans, fontSize: 15, fontWeight: 700 }}>Explorar equipamento</a>
    </div>
  );

  const head = (
    <>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Seu radar de vento</div>
      <h1 style={{ fontFamily: font.serif, fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 6px' }}>Favoritos</h1>
      <div style={{ fontSize: 15.5, color: color.inkMute, marginBottom: 28 }}>{countLabel}</div>
    </>
  );

  return (
    <>
      {/* MOBILE */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ padding: '20px 18px 96px' }}>
          {head}
          {items.length === 0 ? empty : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((it) => <ListingCard key={it.id} item={it} imgHeight={200} />)}
            </div>
          )}
        </div>
        <MobileTabBar active="fav" />
      </div>

      {/* DESKTOP */}
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px 80px' }}>
          {head}
          {items.length === 0 ? empty : (
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
