// Pedidos — caixa do contato estruturado (substitui o chat). Recebidos (vendedor:
// aceitar/recusar) + Enviados (comprador: status + WhatsApp quando liberado).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../lib/session';
import { getRequestsForUser } from '../../lib/requests';
import { listNotifications } from '../../lib/notifications';
import { notificationText, notificationHref, timeAgo } from '../../lib/notification-copy';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../components/MobileChrome';
import { RequestActions } from '../../components/RequestActions';
import { DealBox } from '../../components/DealBox';
import { CancelRequestButton } from '../../components/CancelRequestButton';
import { MarkNotificationsRead } from '../../components/MarkNotificationsRead';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas negociações | Kitetropos' };

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ST: Record<string, string> = { pending: 'Aguardando você', accepted: 'Aceito', declined: 'Recusado' };
const STO: Record<string, string> = { pending: 'Aguardando o vendedor', accepted: 'Aceito. Contato liberado', declined: 'Recusado' };

function typeLabel(t: string, amount: number | null) {
  return t === 'offer' ? `Oferta de ${amount != null ? brl(amount) : 'valor não informado'}` : 'Pedido de visita';
}

function Thumb({ src }: { src: string | null }) {
  return <div style={{ width: 84, height: 84, borderRadius: 13, flex: 'none', backgroundImage: src ? `url("${src}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${color.line}` }} />;
}

export default async function Pedidos(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fpedidos');
  const { incoming, outgoing, moreIncoming, moreOutgoing } = await getRequestsForUser(user.id);
  // Feed de novidades: dá voz às notificações (antes só viravam um número no badge).
  // Renderiza ANTES do MarkNotificationsRead marcar tudo lido, então as não-lidas
  // aparecem destacadas neste carregamento e ficam normais no próximo.
  const notifs = await listNotifications(user.id, 12);
  const novos = incoming.filter((r) => r.status === 'pending').length;
  // sem ?tab explícito, abre na aba que tem conteúdo (comprador cai em "Enviados").
  const tab: 'received' | 'sent' =
    searchParams?.tab === 'sent' ? 'sent'
    : searchParams?.tab === 'received' ? 'received'
    : incoming.length === 0 && outgoing.length > 0 ? 'sent' : 'received';

  const heading = (
    <>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Ofertas, visitas e negócios</div>
      <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, margin: '6px 0 0', color: color.primary }}>Minhas negociações</h1>
    </>
  );

  const novidades = notifs.length > 0 ? (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Novidades</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifs.map((n) => (
          <Link key={n.id} href={notificationHref(n)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: n.readAt ? '#fff' : '#eef5f1', border: `1px solid ${n.readAt ? color.lineCard : '#cfe3d9'}`, borderRadius: 12, padding: '10px 12px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 6, flex: 'none', background: n.readAt ? 'transparent' : color.primary, border: n.readAt ? `1.5px solid ${color.lineCard}` : 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: color.ink, lineHeight: 1.4 }}>{notificationText(n)}</div>
              <div style={{ fontSize: 11.5, color: color.inkFaint2, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  ) : null;

  const cardsList = tab === 'received' ? (
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
        {r.status === 'accepted' && r.buyer.whatsapp && <ContactLiberado name={r.buyer.name} whatsapp={r.buyer.whatsapp} />}
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
        {r.whatsapp && <ContactLiberado name={r.seller.name} whatsapp={r.whatsapp} />}
        {r.status === 'accepted' && <DealBox requestId={r.id} role="buyer" deal={r.deal} />}
        {/* retirar: pendente, ou aceito sem venda marcada (com venda marcada, o caminho é "não comprei" no DealBox) */}
        {(r.status === 'pending' || (r.status === 'accepted' && (!r.deal || r.deal.status === 'cancelled'))) && <CancelRequestButton requestId={r.id} type={r.type} accepted={r.status === 'accepted'} />}
      </Row>
    ))}{moreOutgoing && <MoreNote />}</>
  );

  // Item do rail de filtro (desktop, refresh editorial): ativo preenchido, contagem ao lado.
  const railItem = (on: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 14px', borderRadius: 11, textDecoration: 'none', fontFamily: font.sans, fontSize: 14, fontWeight: 700, background: on ? color.primary : 'transparent', color: on ? '#fff' : color.ink });

  // MOBILE — coluna única (já boa): headline + novidades + abas + cards.
  const body = (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <MarkNotificationsRead />
      <div style={{ marginBottom: 22 }}>{heading}</div>
      {novidades}
      <div style={{ display: 'flex', gap: 6, background: '#ece3d2', borderRadius: 13, padding: 5, marginBottom: 24, maxWidth: 380 }}>
        <Link href="/pedidos?tab=received" style={tab === 'received' ? segOn : segOff}>Recebidos{novos > 0 ? <span style={tabBadge}>{novos}</span> : incoming.length > 0 ? <span style={tabCount}>{incoming.length}</span> : null}</Link>
        <Link href="/pedidos?tab=sent" style={tab === 'sent' ? segOn : segOff}>Enviados{outgoing.length > 0 && <span style={tabCount}>{outgoing.length}</span>}</Link>
      </div>
      {cardsList}
    </div>
  );

  // DESKTOP — 2-col editorial (refresh): rail de filtro à esquerda + cards à direita.
  const desktopBody = (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <MarkNotificationsRead />
      <div style={{ marginBottom: 28 }}>{heading}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,250px) minmax(0,1fr)', gap: 32, alignItems: 'start' }}>
        <aside style={{ position: 'sticky', top: 96 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkFaint2, margin: '4px 4px 8px' }}>Filtrar</div>
          <nav style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 8, boxShadow: '0 6px 24px rgba(20,72,62,0.06)' }}>
            <Link href="/pedidos?tab=received" style={railItem(tab === 'received')}>
              <span>Recebidos</span>
              {novos > 0 ? <span style={tabBadge}>{novos}</span> : incoming.length > 0 ? <span style={{ ...tabCount, ...(tab === 'received' ? { background: 'rgba(255,255,255,0.22)', color: '#fff' } : {}) }}>{incoming.length}</span> : null}
            </Link>
            <Link href="/pedidos?tab=sent" style={railItem(tab === 'sent')}>
              <span>Enviados</span>
              {outgoing.length > 0 && <span style={{ ...tabCount, ...(tab === 'sent' ? { background: 'rgba(255,255,255,0.22)', color: '#fff' } : {}) }}>{outgoing.length}</span>}
            </Link>
          </nav>
        </aside>
        <div>
          {novidades}
          {cardsList}
        </div>
      </div>
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
        <main style={{ padding: '36px 32px 80px' }}>{desktopBody}</main>
        <Footer />
      </div>
    </>
  );
}

const rowLink: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' };
const titleTxt: React.CSSProperties = { fontFamily: font.serif, fontSize: 19, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const okTag: React.CSSProperties = { marginTop: 12, fontSize: 13, fontWeight: 600, color: color.primary };
function Row({ children }: { children: React.ReactNode }) { return <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>{children}</div>; }

// Mini-jornada Interesse → Contato → Negócio (refresh tela negociação). Puramente visual.
function MiniStepper() {
  const steps: { l: string; done?: boolean; active?: boolean }[] = [{ l: 'Interesse', done: true }, { l: 'Contato', active: true }, { l: 'Negócio' }];
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 10px', margin: '4px 0 16px' }}>
      <div style={{ position: 'absolute', top: 11, left: 28, right: 28, height: 1, background: color.line }} />
      {steps.map((s) => {
        const on = s.done || s.active;
        return (
          <div key={s.l} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <span style={{ width: s.active ? 24 : 20, height: s.active ? 24 : 20, transform: 'rotate(45deg)', borderRadius: 3, background: on ? color.primary : '#fff', border: on ? 'none' : `1px solid ${color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: s.active ? '0 3px 10px rgba(20,72,62,0.25)' : 'none' }}>
              {s.done && <span style={{ transform: 'rotate(-45deg)', color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: on ? color.primary : color.inkFaint2 }}>{s.l}</span>
          </div>
        );
      })}
    </div>
  );
}

// Card "Contato Liberado" (refresh): editorializa o estado aceito — contato liberado +
// WhatsApp + lead-in pro DealBox. Mesma lógica/visibilidade do botão que substitui.
function ContactLiberado({ name, whatsapp }: { name?: string; whatsapp?: string | null }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 14, padding: '16px 16px 14px', marginTop: 12, boxShadow: '0 6px 24px rgba(20,72,62,0.06)' }}>
      <MiniStepper />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 15, color: '#8a6a3a' }}>Contato liberado</div>
        {name && <div style={{ fontFamily: font.sans, fontWeight: 900, fontSize: 18, letterSpacing: '-0.01em', color: color.primary, marginTop: 2 }}>{name} está aguardando</div>}
      </div>
      {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '13px 18px', borderRadius: 11, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>Conversar no WhatsApp</a>}
      <p style={{ fontSize: 12.5, color: color.inkMute, textAlign: 'center', lineHeight: 1.45, margin: '12px 0 0' }}>O contato foi liberado pra vocês combinarem entrega e pagamento direto.</p>
      <p style={{ fontSize: 11, color: color.inkFaint2, textAlign: 'center', margin: '6px 0 0' }}>Depois de combinar, confirme o negócio abaixo.</p>
    </div>
  );
}
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
