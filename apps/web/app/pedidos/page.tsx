// Pedidos — caixa do contato estruturado (substitui o chat). Recebidos (vendedor:
// aceitar/recusar) + Enviados (comprador: status + WhatsApp quando liberado).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../lib/session';
import { getRequestsForUser } from '../../lib/requests';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';
import { RequestActions } from '../../components/RequestActions';
import { DealBox } from '../../components/DealBox';
import { CancelRequestButton } from '../../components/CancelRequestButton';
import { MarkNotificationsRead } from '../../components/MarkNotificationsRead';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas negociações — Kitetropos' };

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ST: Record<string, string> = { pending: 'Aguardando você', accepted: 'Aceito', declined: 'Recusado' };
const STO: Record<string, string> = { pending: 'Aguardando o vendedor', accepted: 'Aceito — contato liberado', declined: 'Recusado' };

function typeLabel(t: string, amount: number | null) {
  return t === 'offer' ? `Oferta de ${amount != null ? brl(amount) : '—'}` : 'Pedido de visita';
}

function Thumb({ src }: { src: string | null }) {
  return <div style={{ width: 84, height: 84, borderRadius: 13, flex: 'none', backgroundImage: src ? `url("${src}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${color.line}` }} />;
}

export default async function Pedidos(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fpedidos');
  const { incoming, outgoing, moreIncoming, moreOutgoing } = await getRequestsForUser(user.id);
  const novos = incoming.filter((r) => r.status === 'pending').length;
  // sem ?tab explícito, abre na aba que tem conteúdo (comprador cai em "Enviados").
  const tab: 'received' | 'sent' =
    searchParams?.tab === 'sent' ? 'sent'
    : searchParams?.tab === 'received' ? 'received'
    : incoming.length === 0 && outgoing.length > 0 ? 'sent' : 'received';

  const body = (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <MarkNotificationsRead />
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Ofertas, visitas e negócios</div>
      <h1 style={{ fontFamily: font.serif, fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 22px' }}>Minhas negociações</h1>

      {/* abas */}
      <div style={{ display: 'flex', gap: 6, background: '#ece3d2', borderRadius: 13, padding: 5, marginBottom: 24, maxWidth: 380 }}>
        <Link href="/pedidos?tab=received" style={tab === 'received' ? segOn : segOff}>Recebidos{novos > 0 ? <span style={tabBadge}>{novos}</span> : incoming.length > 0 ? <span style={tabCount}>{incoming.length}</span> : null}</Link>
        <Link href="/pedidos?tab=sent" style={tab === 'sent' ? segOn : segOff}>Enviados{outgoing.length > 0 && <span style={tabCount}>{outgoing.length}</span>}</Link>
      </div>

      {tab === 'received' ? (
        incoming.length === 0 ? <Empty>Nenhuma oferta ou visita recebida ainda.</Empty> : <>{incoming.map((r) => (
          <Row key={r.id}>
            <a href={`/anuncio/${r.listing.id}`} style={rowLink}><Thumb src={r.listing.thumb} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}><TypeTag type={r.type} /><StatusBadge status={r.status} dealStatus={r.deal?.status} received /></div>
                <div style={titleTxt}>{r.listing.title}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: color.primary, marginTop: 2 }}>{typeLabel(r.type, r.amount)}{r.component !== 'conjunto' ? ` · ${r.componentLabel}` : ''}</div>
                <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>de {r.buyer.name}</div>
              </div>
            </a>
            {/* §8 — antes do aceite o vendedor só tem Recusar/Conversar (RequestActions); o
                contato do comprador só aparece depois do aceite. */}
            {r.status === 'accepted' && r.buyer.whatsapp && <a href={r.buyer.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, marginRight: 10, background: '#25D366', color: '#fff', padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Conversar no WhatsApp</a>}
            {r.status === 'pending' && r.listing.status === 'paused' && <PausedHint />}
            {r.status === 'pending' && <RequestActions id={r.id} type={r.type} />}
            {r.status === 'accepted' && <DealBox requestId={r.id} role="seller" deal={r.deal} />}
          </Row>
        ))}{moreIncoming && <MoreNote />}</>
      ) : (
        outgoing.length === 0 ? <Empty>Você ainda não fez ofertas nem agendou visitas.</Empty> : <>{outgoing.map((r) => (
          <Row key={r.id}>
            <a href={`/anuncio/${r.listing.id}`} style={rowLink}><Thumb src={r.listing.thumb} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}><TypeTag type={r.type} /><StatusBadge status={r.status} dealStatus={r.deal?.status} /></div>
                <div style={titleTxt}>{r.listing.title}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: color.ink, marginTop: 2 }}>{typeLabel(r.type, r.amount)}{r.component !== 'conjunto' ? ` · ${r.componentLabel}` : ''}</div>
                <div style={{ fontSize: 12.5, color: color.inkFaint2 }}>pra {r.seller.name}</div>
              </div>
            </a>
            {r.whatsapp && <a href={r.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, background: '#25D366', color: '#fff', padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Conversar no WhatsApp</a>}
            {r.status === 'accepted' && <DealBox requestId={r.id} role="buyer" deal={r.deal} />}
            {/* retirar: pendente, ou aceito sem venda marcada (com venda marcada, o caminho é "não comprei" no DealBox) */}
            {(r.status === 'pending' || (r.status === 'accepted' && (!r.deal || r.deal.status === 'cancelled'))) && <CancelRequestButton requestId={r.id} type={r.type} accepted={r.status === 'accepted'} />}
          </Row>
        ))}{moreOutgoing && <MoreNote />}</>
      )}
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
const titleTxt: React.CSSProperties = { fontFamily: font.serif, fontSize: 19, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const okTag: React.CSSProperties = { marginTop: 12, fontSize: 13, fontWeight: 600, color: color.primary };
function Row({ children }: { children: React.ReactNode }) { return <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>{children}</div>; }
function TypeTag({ type }: { type: string }) {
  const offer = type === 'offer';
  return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: offer ? '#e8f1ec' : '#f3e7d3', color: offer ? color.primary : '#8a6a3a' }}>{offer ? 'Oferta' : 'Visita'}</span>;
}
// Todos os estados do pedido têm rótulo próprio — os encerrados (retirado, vendido
// a outro, anúncio removido, expirado) ficam neutros e NÃO parecem ativos. O estado do
// NEGÓCIO (deal) tem prioridade sobre o do pedido: o request fica 'accepted' enquanto o
// deal evolui (venda marcada → concluído → correção/disputa/reversão). cancelled/voided
// caem no status do pedido (negociação ativa de novo / vendido a outro).
function StatusBadge({ status, dealStatus, received }: { status: string; dealStatus?: string; received?: boolean }) {
  const closed = { fg: '#6b7a73', bg: '#eceae3' }; // encerrado/neutro
  const amber = { fg: '#8a6a3a', bg: '#f3e7d3' }; // em andamento/atenção
  const red = { fg: '#9a5040', bg: '#fbeae4' };
  let label = '', fg = '', bg = '';
  if (dealStatus === 'completed') { label = 'Concluído'; fg = '#15463b'; bg = '#cfe3d9'; }
  else if (dealStatus === 'seller_confirmed') { label = 'Venda marcada'; ({ fg, bg } = amber); }
  else if (dealStatus === 'reversal_requested') { label = 'Correção pedida'; ({ fg, bg } = amber); }
  else if (dealStatus === 'disputed') { label = 'Em disputa'; ({ fg, bg } = red); }
  else if (dealStatus === 'reversed') { label = 'Revertido'; ({ fg, bg } = closed); }
  else if (dealStatus === 'closed_unconfirmed') { label = 'Encerrado'; ({ fg, bg } = closed); }
  else if (status === 'accepted') { label = 'Aceito'; fg = color.primary; bg = '#e8f1ec'; }
  else if (status === 'declined') { label = 'Recusada'; ({ fg, bg } = red); }
  else if (status === 'withdrawn') { label = received ? 'Retirada pelo comprador' : 'Retirada'; ({ fg, bg } = closed); }
  else if (status === 'listing_removed') { label = 'Anúncio removido'; ({ fg, bg } = closed); }
  else if (status === 'sold_elsewhere') { label = 'Vendido a outro'; ({ fg, bg } = closed); }
  else if (status === 'expired') { label = 'Expirada'; ({ fg, bg } = closed); }
  else { label = received ? 'Novo' : 'Enviado'; ({ fg, bg } = amber); } // pending
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, color: fg, background: bg }}>{label}</span>;
}
function Empty({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 14, color: color.inkFaint2, padding: '8px 0 4px', textAlign: 'center', border: '1px dashed #d3ccbd', borderRadius: 16 }}>{children}</div>; }
// Teto de payload: mostra os 50 mais recentes (paginação completa fica como evolução).
function MoreNote() { return <div style={{ fontSize: 12.5, color: color.inkFaint2, textAlign: 'center', padding: '6px 0 2px' }}>Mostrando os 50 mais recentes.</div>; }
// Anúncio pausado com pedido pendente: aceitar dá erro (só aceita anúncio ativo).
function PausedHint() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#f3e7d3', color: '#8a6a3a', fontSize: 12.5, fontWeight: 600, padding: '9px 12px', borderRadius: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#c9a24b', flex: 'none' }} />
      Anúncio pausado. Reative o anúncio para aceitar esta solicitação.
    </div>
  );
}
const segOn: React.CSSProperties = { flex: 1, textAlign: 'center', background: '#fff', color: color.ink, borderRadius: 9, padding: 11, fontFamily: font.sans, fontSize: 14, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const segOff: React.CSSProperties = { ...segOn, background: 'transparent', color: color.inkMute, fontWeight: 600, boxShadow: 'none' };
const tabBadge: React.CSSProperties = { background: '#c0492f', color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
const tabCount: React.CSSProperties = { background: color.chipSoftBg, color: color.primary, fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
