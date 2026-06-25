// Meus anúncios — gerenciar os próprios listings (inclui pausados/arquivados,
// que não aparecem no perfil público). Cada um com Editar/Pausar/Excluir inline.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/session';
import { getMyListings } from '../../../lib/browse';
import { listingsWithSaleRecord } from '../../../lib/deals';
import { color, font } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { Footer } from '../../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { OwnerControls } from '../../../components/OwnerControls';

export const dynamic = 'force-dynamic';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: 'Ativo', bg: '#e8f1ec', fg: '#1f6b5c' },
  paused: { label: 'Pausado', bg: '#fbf0d8', fg: '#7a5e1f' },
  sold: { label: 'Vendido', bg: '#eee', fg: '#555' },
  archived: { label: 'Arquivado', bg: '#eee', fg: '#777' },
  draft: { label: 'Rascunho', bg: '#eee', fg: '#777' },
};

export default async function MeusAnuncios() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fconta%2Fanuncios');
  const items = await getMyListings(user.id);
  // §10 — quais anúncios já registram venda (não podem ser excluídos). Batch, sem N+1.
  const saleRecords = await listingsWithSaleRecord(items.map((it) => it.id));

  const body = (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Meus anúncios</h1>
      <div style={{ fontSize: 14, color: color.inkMute, marginBottom: 20 }}>{items.length} no total</div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.inkFaint2, marginBottom: 14 }}>Você ainda não tem anúncios.</div>
          <Link href="/anunciar" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700 }}>Anunciar o primeiro</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((it) => {
            const st = STATUS[it.status] ?? STATUS.archived;
            return (
              <div key={it.id} style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 14 }}>
                <a href={`/anuncio/${it.id}`} style={{ display: 'flex', gap: 13, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 11, flex: 'none', backgroundImage: it.photo ? `url("${it.photo}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${color.line}` }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: color.inkFaint2 }}>{it.brand}{it.includesBar ? ' · kit' : ''}</div>
                    <div style={{ fontFamily: font.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.model}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{it.priceLabel}</div>
                  </div>
                  <span style={{ flex: 'none', alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.fg }}>{st.label}</span>
                </a>
                <OwnerControls listingId={it.id} status={it.status} saleRecord={saleRecords.has(it.id)} compact />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ padding: '20px 18px 96px' }}>{body}</div>
        <MobileTabBar active="anuncios" />
      </div>
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '36px 32px 80px' }}>{body}</main>
        <Footer />
      </div>
    </>
  );
}
