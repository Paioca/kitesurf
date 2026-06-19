// Pedidos — caixa do contato estruturado (substitui o chat). Recebidos (vendedor:
// aceitar/recusar) + Enviados (comprador: status + WhatsApp quando liberado).
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/session';
import { getRequestsForUser } from '../../lib/requests';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';
import { RequestActions } from '../../components/RequestActions';
import { DealBox } from '../../components/DealBox';

export const dynamic = 'force-dynamic';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ST: Record<string, string> = { pending: 'Aguardando você', accepted: 'Aceito', declined: 'Recusado' };
const STO: Record<string, string> = { pending: 'Aguardando o vendedor', accepted: 'Aceito — contato liberado', declined: 'Recusado' };

function typeLabel(t: string, amount: number | null) {
  return t === 'offer' ? `Oferta de ${amount != null ? brl(amount) : '—'}` : 'Pedido de visita';
}

function Thumb({ src }: { src: string | null }) {
  return <div style={{ width: 56, height: 56, borderRadius: 10, flex: 'none', backgroundImage: src ? `url("${src}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${color.line}` }} />;
}

export default async function Pedidos() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const { incoming, outgoing } = await getRequestsForUser(user.id);

  const body = (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Pedidos</h1>
      <div style={{ fontSize: 14, color: color.inkMute, marginBottom: 24 }}>Ofertas e visitas. Ao aceitar, seu WhatsApp é liberado pro comprador.</div>

      <SectionTitle>Recebidos</SectionTitle>
      {incoming.length === 0 ? <Empty>Nenhum pedido recebido ainda.</Empty> : incoming.map((r) => (
        <Row key={r.id}>
          <a href={`/anuncio/${r.listing.id}`} style={rowLink}><Thumb src={r.listing.thumb} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={titleTxt}>{r.listing.title}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: color.primary, marginTop: 2 }}>{typeLabel(r.type, r.amount)}</div>
              <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>de {r.buyer.name} · {ST[r.status]}</div>
            </div>
          </a>
          {r.status === 'pending' && <RequestActions id={r.id} />}
          {r.status === 'accepted' && <div style={okTag}>WhatsApp liberado pro comprador</div>}
          {r.status === 'accepted' && <DealBox requestId={r.id} role="seller" deal={r.deal} />}
        </Row>
      ))}

      <div style={{ height: 28 }} />
      <SectionTitle>Enviados</SectionTitle>
      {outgoing.length === 0 ? <Empty>Você ainda não fez ofertas nem pediu visitas.</Empty> : outgoing.map((r) => (
        <Row key={r.id}>
          <a href={`/anuncio/${r.listing.id}`} style={rowLink}><Thumb src={r.listing.thumb} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={titleTxt}>{r.listing.title}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: color.ink, marginTop: 2 }}>{typeLabel(r.type, r.amount)}</div>
              <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>pra {r.seller.name} · {STO[r.status]}</div>
            </div>
          </a>
          {r.whatsapp && <a href={r.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, background: '#25D366', color: '#fff', padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Falar no WhatsApp</a>}
          {r.status === 'accepted' && <DealBox requestId={r.id} role="buyer" deal={r.deal} />}
        </Row>
      ))}
    </div>
  );

  return (
    <>
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ padding: '20px 18px 96px' }}>{body}</div>
        <MobileTabBar active="msg" />
      </div>
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '36px 32px 80px' }}>{body}</main>
        <Footer />
      </div>
    </>
  );
}

const rowLink: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' };
const titleTxt: React.CSSProperties = { fontFamily: font.serif, fontSize: 16, fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const okTag: React.CSSProperties = { marginTop: 12, fontSize: 13, fontWeight: 600, color: color.primary };
function Row({ children }: { children: React.ReactNode }) { return <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>{children}</div>; }
function SectionTitle({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: font.serif, fontSize: 19, fontWeight: 600, marginBottom: 12 }}>{children}</div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 14, color: color.inkFaint2, padding: '8px 0 4px' }}>{children}</div>; }
