// Hub da conta do usuário logado — ponto de saída (logout) e acesso ao próprio
// perfil. Redireciona pra /entrar se não houver sessão.
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/session';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';
import { LogoutButton } from '../../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function Conta() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fconta');

  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const initials = (user.name ?? '?').slice(0, 2).toUpperCase();

  // Conta = administrativo. Marketplace (Pedidos, Anúncios, Favoritos) fica no header/abas.
  const contact: { k: string; v: string; verified?: boolean; muted?: boolean }[] = [
    { k: 'Telefone / WhatsApp', v: user.phone, verified: user.phoneVerified },
    { k: 'E-mail', v: user.email || 'não informado', muted: !user.email },
    { k: 'Instagram', v: user.instagramHandle ? `@${user.instagramHandle}` : 'não informado', muted: !user.instagramHandle },
  ];
  const links: { href: string; label: string; desc: string }[] = [
    { href: '/conta/editar', label: 'Editar perfil', desc: 'Foto, nome, e-mail, Instagram, idioma' },
    { href: '/conta/anuncios', label: 'Meus anúncios', desc: 'Gerenciar — editar, pausar, excluir (inclui pausados)' },
    { href: `/perfil/${user.id}`, label: 'Meu perfil público', desc: 'Como os outros te veem — anúncios e avaliações' },
  ];

  const body = (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 20px' }}>Minha conta</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, flex: 'none', background: user.avatarUrl ? `center/cover url("${user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!user.avatarUrl && initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: color.inkFaint2, marginTop: 2 }}>
            {user.instagramHandle ? `@${user.instagramHandle} · ` : ''}membro desde {memberSince}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, margin: '6px 2px 8px' }}>Dados da conta</div>
      <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        {contact.map((c, i) => (
          <div key={c.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i ? `1px solid ${color.line}` : 'none' }}>
            <span style={{ fontSize: 13.5, color: color.inkFaint }}>{c.k}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: c.muted ? color.inkFaint2 : color.ink, textAlign: 'right' }}>
              {c.v}
              {c.verified && <span style={{ fontSize: 11, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '3px 8px', borderRadius: 999 }}>verificado</span>}
            </span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${color.line}`, padding: '11px 18px', fontSize: 12, color: color.inkFaint2 }}>O telefone é seu login e não muda. E-mail e Instagram você ajusta em Editar perfil.</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, margin: '6px 2px 8px' }}>Conta</div>
      <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        {links.map((l, i) => (
          <a key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px', textDecoration: 'none', color: color.ink, borderTop: i ? `1px solid ${color.line}` : 'none' }}>
            <span>
              <span style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>{l.label}</span>
              <span style={{ fontSize: 12.5, color: color.inkFaint2 }}>{l.desc}</span>
            </span>
            <span style={{ color: color.inkFaint2, fontSize: 18 }}>›</span>
          </a>
        ))}
      </div>

      <LogoutButton />
    </div>
  );

  return (
    <>
      {/* MOBILE */}
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ padding: '22px 18px 96px' }}>{body}</div>
        <MobileTabBar active="perfil" />
      </div>

      {/* DESKTOP */}
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '40px 32px 80px' }}>{body}</main>
        <Footer />
      </div>
    </>
  );
}
