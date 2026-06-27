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
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Painel do vendedor</div>
      <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, margin: '0 0 6px', color: color.primary }}>Meus anúncios</h1>
      <div style={{ fontSize: 14, color: color.inkMute, marginBottom: 24 }}>{items.length} {items.length === 1 ? 'anúncio' : 'anúncios'} no total</div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.inkFaint2, marginBottom: 14 }}>Você ainda não tem anúncios.</div>
          <Link href="/anunciar" style={{ display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700 }}>Anunciar o primeiro</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((it) => {
            const st = STATUS[it.status] ?? STATUS.archived;
            const hasSale = saleRecords.has(it.id);
            return (
              // Card painel (refresh): foto grande do equipamento + ficha + ações.
              <div key={it.id} style={{ display: 'flex', background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 24px rgba(20,72,62,0.06)' }}>
                <a href={`/anuncio/${it.id}`} className="anuncio-photo" style={{ position: 'relative', display: 'block', backgroundImage: it.photo ? `url("${it.photo}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center', textDecoration: 'none' }}>
                  <span style={{ position: 'absolute', top: 12, left: 12, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.fg }}>{st.label}</span>
                </a>
                <div style={{ flex: 1, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
                  <a href={`/anuncio/${it.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: color.inkFaint2 }}>{it.brand}{it.includesBar ? ' · kit' : ''}</div>
                    <div style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, lineHeight: 1.1, margin: '3px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.model}</div>
                    <div style={{ fontFamily: font.sans, fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: color.primary }}>{it.priceLabel}</div>
                  </a>
                  {hasSale && <div style={{ fontSize: 12, color: '#8a6a3a', marginTop: 8, fontStyle: 'italic' }}>Tem venda registrada. Fica no histórico e não pode ser excluído.</div>}
                  <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                    <OwnerControls listingId={it.id} status={it.status} saleRecord={hasSale} compact />
                  </div>
                </div>
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
