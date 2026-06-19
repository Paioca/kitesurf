// Perfil público — design Kite Life (handoff Perfil.dc.html). Server-rendered.
// Reputação real: stats e avaliações vêm de Deals/Reviews concluídos.
import { notFound } from 'next/navigation';
import { getProfile } from '../../../lib/profile';
import { color, font, heroGradient } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { Footer } from '../../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { ListingCard } from '../../../components/ListingCard';

export const dynamic = 'force-dynamic';

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export default async function PerfilPage({ params }: { params: { id: string } }) {
  const data = await getProfile(params.id);
  if (!data) notFound();
  const { user, stats, listings, reviews } = data;
  const initials = user.name.slice(0, 2).toUpperCase();
  const since = new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: heroGradient }} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 90px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: -46, marginBottom: 30, flexWrap: 'wrap' }}>
          <div style={{ width: 108, height: 108, borderRadius: 24, background: user.avatarUrl ? `center/cover url("${user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 36, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f6f3ec', flex: 'none' }}>
            {!user.avatarUrl && initials}
          </div>
          <div style={{ flex: 1, minWidth: 240, paddingBottom: 4 }}>
            <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 6px' }}>{user.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14, color: color.inkMute }}>
              {user.instagramHandle && <><span>@{user.instagramHandle}</span><span style={{ color: '#cbd3cc' }}>·</span></>}
              <span>na Kite Life desde {since}</span>
            </div>
          </div>
        </div>

        {/* verificações + sobre */}
        <div className="two-col" style={{ marginBottom: 18 }}>
          <div style={card}>
            <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>O que é verificado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <VerifiedRow on={user.phoneVerified} title="Telefone verificado" desc="1 número = 1 conta · confirmado por código" />
              <VerifiedRow on={!!user.instagramHandle} title="Instagram conectado" desc={user.instagramHandle ? `@${user.instagramHandle}` : 'não conectado'} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0ebde' }}>
              <span style={{ color: color.inkFaint2, fontSize: 13, flex: 'none' }}>🔒</span>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: color.inkFaint2, margin: 0 }}>O número e o e-mail nunca aparecem para outros usuários — só o selo de "verificado".</p>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Sobre o usuário</div>
            <AboutRow k="Membro desde" v={since} />
            <AboutRow k="Papel" v={user.role === 'business' ? 'Negócio' : 'Pessoa física'} />
            {user.instagramHandle && <AboutRow k="Instagram" v={`@${user.instagramHandle}`} last />}
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: color.line, border: `1px solid ${color.line}`, borderRadius: 16, overflow: 'hidden', marginBottom: 44 }}>
          <Stat value={stats.ratingAvg != null ? `★ ${stats.ratingAvg.toFixed(1)}` : '—'} label={stats.ratingCount ? `média de ${stats.ratingCount} avaliações` : 'sem avaliações ainda'} star />
          <Stat value={String(stats.salesCount)} label="vendas concluídas" />
          <Stat value={String(stats.purchasesCount)} label="compras realizadas" />
          <Stat value={String(stats.activeCount)} label="anúncios ativos" />
        </div>

        {/* listings */}
        {listings.length > 0 && (
          <>
            <h2 style={{ fontFamily: font.serif, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', margin: '0 0 18px' }}>Anúncios ativos</h2>
            <div className="perfil-grid" style={{ display: 'grid', gap: 22, marginBottom: 48 }}>
              {listings.map((it) => <ListingCard key={it.id} item={it} imgHeight={170} />)}
            </div>
          </>
        )}

        {/* reviews */}
        <h2 style={{ fontFamily: font.serif, fontSize: 26, fontWeight: 600, letterSpacing: '-0.3px', margin: '0 0 18px' }}>Avaliações</h2>
        {reviews.length === 0 ? (
          <div style={{ ...card, fontStyle: 'italic', fontFamily: font.serif, color: color.inkFaint2 }}>Ainda sem avaliações. Elas aparecem após uma venda confirmada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map((r) => (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: color.primary, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{r.reviewerName.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.reviewerName}</div>
                    <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>{r.gear ? `${r.gear} · ` : ''}{new Date(r.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, flex: 'none', color: color.accent, letterSpacing: 1 }}>{stars(r.rating)}</div>
                </div>
                {r.comment && <p style={{ fontSize: 14.5, lineHeight: 1.6, color: color.inkSoft, margin: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
      <div className="only-desktop"><Footer /></div>
      <div className="only-mobile"><MobileTabBar /></div>
    </>
  );
}

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 22 };
function VerifiedRow({ on, title, desc }: { on: boolean; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, opacity: on ? 1 : 0.5 }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: '#e8f1ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ color: color.primary, fontSize: 14 }}>{on ? '✓' : '—'}</span></span>
      <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12.5, color: color.inkFaint }}>{desc}</div></div>
    </div>
  );
}
function AboutRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 0', borderBottom: last ? 'none' : '1px solid #f4efe3' }}>
      <span style={{ fontSize: 13.5, color: color.inkFaint }}>{k}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: color.ink, textAlign: 'right' }}>{v}</span>
    </div>
  );
}
function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <div style={{ background: '#fff', padding: 22, textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: star ? color.ink : color.ink }}><span style={star ? { color: color.accent } : undefined}>{value}</span></div>
      <div style={{ fontSize: 13, color: color.inkFaint, marginTop: 4 }}>{label}</div>
    </div>
  );
}
