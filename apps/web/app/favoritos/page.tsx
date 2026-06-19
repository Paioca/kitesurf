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

  const empty = (
    <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.inkFaint2, marginBottom: 14 }}>Você ainda não salvou nenhum anúncio.</div>
      <a href="/" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontFamily: font.sans, fontSize: 14, fontWeight: 700 }}>Explorar equipamento</a>
    </div>
  );

  const head = (
    <>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Favoritos</h1>
      <div style={{ fontSize: 14, color: color.inkMute, marginBottom: 20 }}>{items.length} salvo(s)</div>
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
