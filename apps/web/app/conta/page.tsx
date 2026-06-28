// Hub da conta do usuário logado — ponto de saída (logout) e acesso ao próprio
// perfil. Redireciona pra /entrar se não houver sessão.
import { redirect } from 'next/navigation';
import { getCurrentUser, getNavUser } from '../../lib/session';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';
import { Kicker, Diamond } from '../../components/ui';
import { ListingCard } from '../../components/ListingCard';
import { getMyListings } from '../../lib/browse';
import { LogoutButton } from '../../components/LogoutButton';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { getServerLocale } from '../../lib/locale';

export const dynamic = 'force-dynamic';

const ACCOUNT_COPY = {
  pt: {
    notInformed: 'não informado',
    phone: 'Telefone / WhatsApp',
    spot: 'Spot de interesse',
    nationality: 'Nacionalidade',
    email: 'E-mail',
    editProfile: 'Editar perfil',
    editProfileDesc: 'Foto, nome, spot, e-mail, idioma',
    myListings: 'Meus anúncios',
    myListingsDesc: 'Gerenciar, editar, pausar e excluir (inclui pausados)',
    deals: 'Minhas negociações',
    dealsDesc: 'Ofertas, pedidos de visita e negócios enviados ou recebidos',
    publicProfile: 'Meu perfil público',
    publicProfileDesc: 'Como os outros te veem: anúncios e avaliações',
    welcome: 'Bem-vindo de volta,',
    memberSince: 'membro desde',
    accountData: 'Dados da conta',
    verified: 'verificado',
    phoneHelp: 'O telefone é seu login. Confirme um e-mail de segurança para recuperar a conta se perder acesso ao número.',
    account: 'Conta',
    nextWind: 'Próximo Vento',
    season: 'Temporada',
    showcase: 'Sua vitrine',
    recentListings: 'Anúncios recentes',
    seeAll: 'Ver todos ›',
  },
  en: {
    notInformed: 'not informed',
    phone: 'Phone / WhatsApp',
    spot: 'Spot of interest',
    nationality: 'Nationality',
    email: 'Email',
    editProfile: 'Edit profile',
    editProfileDesc: 'Photo, name, spot, email, language',
    myListings: 'My listings',
    myListingsDesc: 'Manage, edit, pause and delete listings, including paused ones',
    deals: 'My deals',
    dealsDesc: 'Offers, visit requests, and deals sent or received',
    publicProfile: 'My public profile',
    publicProfileDesc: 'How others see you: listings and reviews',
    welcome: 'Welcome back,',
    memberSince: 'member since',
    accountData: 'Account data',
    verified: 'verified',
    phoneHelp: 'Your phone is your login. Confirm a security email to recover the account if you lose access to your number.',
    account: 'Account',
    nextWind: 'Next wind',
    season: 'Season',
    showcase: 'Your showcase',
    recentListings: 'Recent listings',
    seeAll: 'See all ›',
  },
};

export default async function Conta() {
  const user = await getCurrentUser();
  const navMe = await getNavUser();
  if (!user) redirect('/entrar?next=%2Fconta');
  const locale = await getServerLocale(user.locale);
  const t = ACCOUNT_COPY[locale];

  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const initials = (user.name ?? '?').slice(0, 2).toUpperCase();
  // Anúncios recentes pro bento (só leitura — mesma query de /conta/anuncios). 4 últimos.
  const recent = (await getMyListings(user.id)).slice(0, 4);

  // Conta = administrativo. Marketplace (Negociações, Anúncios, Favoritos) fica no header/abas.
  const contact: { k: string; v: string; verified?: boolean; muted?: boolean }[] = [
    { k: t.phone, v: user.phone, verified: user.phoneVerified },
    { k: t.spot, v: user.spot || t.notInformed, muted: !user.spot },
    { k: t.nationality, v: user.country || t.notInformed, muted: !user.country },
    { k: t.email, v: user.email || t.notInformed, verified: user.emailVerified, muted: !user.email },
  ];
  const links: { href: string; label: string; desc: string }[] = [
    { href: '/conta/editar', label: t.editProfile, desc: t.editProfileDesc },
    { href: '/conta/anuncios', label: t.myListings, desc: t.myListingsDesc },
    { href: '/pedidos', label: t.deals, desc: t.dealsDesc },
    { href: `/perfil/${user.id}`, label: t.publicProfile, desc: t.publicProfileDesc },
  ];

  // Peças reaproveitadas por mobile (coluna única) e desktop (bento). Mesmos dados/rotas.
  const profileHeader = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 88, height: 88, borderRadius: 999, flex: 'none', background: user.avatarUrl ? `center/cover url("${user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff', boxShadow: '0 6px 24px rgba(20,72,62,0.10)' }}>
        {!user.avatarUrl && initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <Kicker>{t.welcome}</Kicker>
        <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.0, margin: '4px 0 0', color: color.primary }}>{user.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: color.inkMute }}>
          <Diamond size={8} c={color.primary} r={1} />
          {t.memberSince} {memberSince}
        </div>
      </div>
    </header>
  );

  const dadosCard = (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, margin: '6px 2px 8px' }}>{t.accountData}</div>
      <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden' }}>
        {/* Campos em grade 2-col (Lifestyle): label-caps uppercase + valor bold, separados por hairline. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: color.line }}>
          {contact.map((c) => (
            <div key={c.k} style={{ background: '#fff', padding: '16px 18px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: color.inkMute, marginBottom: 5 }}>{c.k}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', fontSize: 14.5, fontWeight: 700, color: c.muted ? color.inkFaint2 : color.ink }}>
                {c.v}
                {c.verified && <span style={{ fontSize: 10.5, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '3px 8px', borderRadius: 999 }}>{t.verified}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${color.line}`, padding: '11px 18px', fontSize: 12, color: color.inkFaint2 }}>{t.phoneHelp}</div>
      </div>
    </div>
  );

  // Rail de navegação (bento): cada link vira uma linha com losango + label + chevron,
  // hover sand. Mesmas rotas do array `links`.
  const navRail = (
    <nav style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 8, boxShadow: '0 6px 24px rgba(20,72,62,0.06)' }}>
      {links.map((l) => (
        <a key={l.href} href={l.href} className="conta-rail-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 14px', borderRadius: 11, textDecoration: 'none', color: color.ink }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Diamond size={9} c={color.primary} r={2} />
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em' }}>{l.label}</span>
          </span>
          <span style={{ color: color.inkFaint2, fontSize: 18 }}>›</span>
        </a>
      ))}
    </nav>
  );

  // Card editorial escuro "Próximo Vento" (palco teatral). Decorativo — usa o hero.
  const promoCard = (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, height: 200, background: color.dark }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/conta-temporada.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,37,32,0.95), rgba(12,37,32,0.1))' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 16, right: 16, width: 16, height: 16, background: color.accent, transform: 'rotate(45deg)', borderRadius: 3, opacity: 0.6, boxShadow: '0 0 22px rgba(217,168,107,0.5)' }} />
      <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 16, color: color.aqua }}>{t.nextWind}</span>
        <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff', marginTop: 2 }}>{t.season} {new Date().getFullYear()}</div>
      </div>
    </div>
  );

  const recentSection = recent.length > 0 && (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, margin: '0 2px 14px' }}>
        <div>
          <Kicker>{t.showcase}</Kicker>
          <h2 style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, margin: '4px 0 0', color: color.primary }}>{t.recentListings}</h2>
        </div>
        <a href="/conta/anuncios" style={{ fontSize: 12.5, fontWeight: 700, color: color.primary, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t.seeAll}</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
        {recent.map((it) => <ListingCard key={it.id} item={it} imgHeight={170} />)}
      </div>
    </div>
  );

  const adminActions = (
    <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 18 }}>
      <LogoutButton locale={locale} />
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <DeleteAccountButton locale={locale} />
      </div>
    </div>
  );

  // MOBILE — coluna única (mantém o layout estreito; já com header + dados Lifestyle).
  const body = (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {profileHeader}
      {dadosCard}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, margin: '0 2px 8px' }}>{t.account}</div>
        {navRail}
      </div>
      {adminActions}
    </div>
  );

  // DESKTOP — bento dashboard (alvo Stitch "Meu Perfil"): header full-width + 2 colunas.
  const desktopBody = (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ marginBottom: 36 }}>{profileHeader}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,9fr)', gap: 28, alignItems: 'start' }}>
        <aside style={{ position: 'sticky', top: 96, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {navRail}
          {promoCard}
        </aside>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {dadosCard}
          {recentSection}
          {adminActions}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar initialMe={navMe} />
        <div style={{ padding: '22px 18px 96px' }}>{body}</div>
        <MobileTabBar initialAuthed={!!navMe} />
      </div>

      {/* DESKTOP */}
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '40px 32px 80px' }}>{desktopBody}</main>
        <Footer />
      </div>
    </>
  );
}
