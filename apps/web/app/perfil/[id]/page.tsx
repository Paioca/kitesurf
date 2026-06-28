// Perfil público — handoff Claude Design (Perfil.dc.html), marca Kitetropos. Server-rendered.
// Reputação real: stats e avaliações vêm de Deals/Reviews concluídos.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProfile } from '../../../lib/profile';
import { color, font } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { Footer } from '../../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { getNavUser } from '../../../lib/session';
import { ListingCard } from '../../../components/ListingCard';

export const dynamic = 'force-dynamic';

// OG do perfil — superfície de "compartilhe pra vender".
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const data = await getProfile(params.id);
  if (!data) return { title: 'Perfil não encontrado | Kitetropos' };
  const { user, stats } = data;
  const rep = stats.ratingCount ? `★ ${stats.ratingAvg?.toFixed(1)} · ${stats.salesCount} venda(s)` : `${stats.activeCount} anúncio(s) ativo(s)`;
  const title = `${user.name} | Kitetropos`;
  const description = `Perfil de ${user.name} na Kitetropos. ${rep}. Telefone verificado, reputação real.`;
  const images = user.avatarUrl ? [user.avatarUrl] : ['/hero-beach.jpg'];
  return { title, description, openGraph: { title, description, type: 'profile', images }, twitter: { card: 'summary', title, description, images } };
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// Cor estável por avaliador (paleta do handoff) — dá vida ao bloco de avaliações.
const AV_COLORS = ['#c08f4f', '#5a7d72', '#1f6b5c', '#a06a4a'];
function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export default async function PerfilPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await getProfile(params.id);
  if (!data) notFound();
  const { user, stats, listings, reviews } = data;
  const navMe = await getNavUser();
  const initials = user.name.slice(0, 2).toUpperCase();
  const since = new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const sinceFull = new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const sellerCity = listings[0]?.city ?? null; // cidade derivada dos anúncios ativos
  const lang = (user as any).locale === 'en' ? 'EN' : 'PT';

  return (
    <>
      <div className="only-mobile"><MobileAppBar initialMe={navMe} /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: '#0c2520' }}>
        <img src="/perfil-cover.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.2),rgba(12,37,32,0.55))' }} />
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 90px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginBottom: 30, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 108, height: 108, borderRadius: 24, marginTop: -54, background: user.avatarUrl ? `center/cover url("${user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 36, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f6f3ec', flex: 'none' }}>
            {!user.avatarUrl && initials}
          </div>
          <div style={{ flex: 1, minWidth: 240, paddingBottom: 4 }}>
            <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.0, margin: '0 0 8px', color: color.primary }}>{user.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14, color: color.inkMute }}>
              {/* Instagram oculto na Fase 0 (coluna preservada pra reativar) */}
              {sellerCity && <><span>{sellerCity}</span><span style={{ color: '#cbd3cc' }}>·</span></>}
              <span>na Kitetropos desde {since}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
            <a href="#anuncios" style={{ background: color.primary, color: '#fff', textDecoration: 'none', padding: '12px 22px', borderRadius: 11, fontSize: 14.5, fontWeight: 700 }}>Ver anúncios</a>
            <span style={{ fontSize: 11.5, color: color.inkFaint2 }}>A conversa começa a partir de um anúncio</span>
          </div>
        </div>

        {/* verificações + sobre */}
        <div className="two-col" style={{ marginBottom: 18 }}>
          <div style={card}>
            <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>O que é verificado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <VerifiedRow on={user.phoneVerified} title="Telefone verificado" desc="1 número = 1 conta · confirmado por código" />
              <VerifiedRow on={user.emailVerified} title="E-mail verificado" desc="Para recuperar acesso e avisos" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0ebde' }}>
              <span style={{ color: color.inkFaint2, fontSize: 13, flex: 'none' }}>🔒</span>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: color.inkFaint2, margin: 0 }}>O e-mail nunca é compartilhado. O telefone não aparece no perfil público; ele só é liberado para a outra parte quando uma solicitação é aceita.</p>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Sobre o usuário</div>
            <AboutRow k="Membro desde" v={sinceFull} />
            {sellerCity && <AboutRow k="Atua em" v={sellerCity} />}
            <AboutRow k="Idiomas" v={lang} />
            <AboutRow k="Papel" v={user.role === 'business' ? 'Negócio' : 'Pessoa física'} last />
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: color.line, border: `1px solid ${color.line}`, borderRadius: 16, overflow: 'hidden', marginBottom: 44 }}>
          <Stat value={stats.ratingAvg != null ? `★ ${stats.ratingAvg.toFixed(1)}` : 'Sem nota'} label={stats.ratingCount ? `média de ${stats.ratingCount} avaliações` : 'sem avaliações ainda'} star />
          <Stat value={String(stats.salesCount)} label="vendas concluídas" />
          <Stat value={String(stats.purchasesCount)} label="compras realizadas" />
          <Stat value={String(stats.activeCount)} label="anúncios ativos" />
        </div>

        {/* listings */}
        {listings.length > 0 && (
          <>
            <h2 id="anuncios" style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', margin: '0 0 18px', scrollMarginTop: 24 }}>Anúncios ativos</h2>
            <div className="perfil-grid" style={{ display: 'grid', gap: 22, marginBottom: 48 }}>
              {listings.map((it) => <ListingCard key={it.id} item={it} imgHeight={170} />)}
            </div>
          </>
        )}

        {/* reviews */}
        <h2 style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', margin: '0 0 18px' }}>Avaliações</h2>
        {reviews.length === 0 ? (
          <div style={{ ...card, fontStyle: 'italic', fontFamily: font.serif, color: color.inkFaint2 }}>Ainda sem avaliações. Elas aparecem após uma venda confirmada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map((r) => (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: avColor(r.reviewerName), color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{r.reviewerName.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.reviewerName}</div>
                    <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>{r.gear ? `${r.gear} · ` : ''}{new Date(r.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, flex: 'none', color: color.primary, letterSpacing: 1 }}>{stars(r.rating)}</div>
                </div>
                {r.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: r.comment ? 10 : 0 }}>
                    {r.tags.map((t) => <span key={t} style={{ fontSize: 12, fontWeight: 600, color: color.primary, background: '#e8f1ec', border: '1px solid #cfe2d8', borderRadius: 999, padding: '4px 10px' }}>{t}</span>)}
                  </div>
                )}
                {r.comment && <p style={{ fontSize: 14.5, lineHeight: 1.6, color: color.inkSoft, margin: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
      <div className="only-desktop"><Footer /></div>
      <div className="only-mobile"><MobileTabBar initialAuthed={!!navMe} /></div>
    </>
  );
}

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 22 };
function VerifiedRow({ on, title, desc, link }: { on: boolean; title: string; desc: string; link?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, opacity: on ? 1 : 0.5 }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: '#e8f1ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ color: color.primary, fontSize: 14 }}>{on ? '✓' : '×'}</span></span>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12.5, color: color.inkFaint }}>{desc}</div></div>
      {on && link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: color.primary, textDecoration: 'none', flex: 'none' }}>Ver ›</a>}
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
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: color.ink }}><span style={star ? { color: color.primary } : undefined}>{value}</span></div>
      <div style={{ fontSize: 13, color: color.inkFaint, marginTop: 4 }}>{label}</div>
    </div>
  );
}
