// Moderação de denúncias — só admin (User.admin). Pra virar admin:
// no Supabase SQL: UPDATE "User" SET admin=true WHERE phone='+55...';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '../../lib/session';
import { db } from '../../lib/db';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { MobileAppBar } from '../../components/MobileChrome';
import { Footer } from '../../components/Footer';
import { ModerationList } from '../../components/ModerationList';
import { DisputeList } from '../../components/DisputeList';

export const dynamic = 'force-dynamic';

function datePt(date: Date) {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
}

export default async function Moderacao() {
  const user = await getCurrentUser();
  if (!user || !user.admin) notFound();

  const raw = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      reporter: { select: { name: true } },
      actions: { orderBy: { createdAt: 'desc' }, include: { moderator: { select: { name: true } } } },
    },
  });

  // estado atual de cada alvo (suspenso/removido?) — batch, sem N+1.
  const userIds = [...new Set(raw.filter((r) => r.targetType === 'user').map((r) => r.targetId))];
  const listingIds = [...new Set(raw.filter((r) => r.targetType === 'listing').map((r) => r.targetId))];
  const [users, listings] = await Promise.all([
    userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, status: true } }) : Promise.resolve([]),
    listingIds.length ? db.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, deletedAt: true } }) : Promise.resolve([]),
  ]);
  const userStatus = new Map(users.map((u) => [u.id, u.status]));
  const listingRemoved = new Map(listings.map((l) => [l.id, l.deletedAt != null]));
  const targetState = (r: { targetType: string; targetId: string }): 'user_active' | 'user_blocked' | 'listing_active' | 'listing_removed' | null => {
    if (r.targetType === 'user') { const s = userStatus.get(r.targetId); return s == null ? null : s === 'blocked' ? 'user_blocked' : 'user_active'; }
    if (r.targetType === 'listing') { const rm = listingRemoved.get(r.targetId); return rm == null ? null : rm ? 'listing_removed' : 'listing_active'; }
    return null;
  };

  const reports = raw.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    createdDate: datePt(r.createdAt),
    reporter: r.reporter?.name ?? 'Não informado',
    targetState: targetState(r),
    actions: r.actions.map((a) => ({ action: a.action, by: a.moderator?.name ?? 'Não informado', at: a.createdAt.toISOString(), date: datePt(a.createdAt), note: a.note })),
  }));

  // 2ª fila (§11) — disputas de venda aguardando decisão do admin (contraparte recusou
  // a correção). Modelo próprio (DealDispute), não Report.
  const dispRaw = await db.dealDispute.findMany({
    where: { status: 'under_review' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      deal: { select: { listingId: true, component: true } },
      openedBy: { select: { id: true, name: true } },
      counterparty: { select: { id: true, name: true } },
    },
  });
  const dispListingIds = [...new Set(dispRaw.map((d) => d.deal.listingId))];
  const dispListings = dispListingIds.length ? await db.listing.findMany({ where: { id: { in: dispListingIds } }, select: { id: true, title: true } }) : [];
  const dispTitle = new Map(dispListings.map((l) => [l.id, l.title]));
  const disputes = dispRaw.map((d) => ({
    id: d.id,
    dealId: d.dealId,
    listingId: d.deal.listingId,
    listingTitle: dispTitle.get(d.deal.listingId) ?? 'Não informado',
    component: d.deal.component,
    reason: d.reason,
    description: d.description,
    openedById: d.openedBy?.id ?? d.openedByUserId,
    openedBy: d.openedBy?.name ?? 'Não informado',
    counterpartyId: d.counterparty?.id ?? d.counterpartyId,
    counterparty: d.counterparty?.name ?? 'Não informado',
    createdAt: d.createdAt.toISOString(),
    createdDate: datePt(d.createdAt),
  }));

  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 6px' }}>Moderação</h1>
        <p style={{ fontSize: 14.5, color: color.inkMute, margin: '0 0 28px' }}>Duas filas: disputas de venda e denúncias.</p>

        <h2 style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, margin: '0 0 4px' }}>Disputas de venda</h2>
        <p style={{ fontSize: 13.5, color: color.inkMute, margin: '0 0 14px' }}>Correções recusadas pela contraparte. {disputes.length} em análise.</p>
        <DisputeList disputes={disputes} />

        <h2 style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, margin: '36px 0 4px' }}>Denúncias</h2>
        <p style={{ fontSize: 13.5, color: color.inkMute, margin: '0 0 14px' }}>{reports.filter((r) => r.status === 'open').length} aberta(s).</p>
        <ModerationList reports={reports} />
      </main>
      <Footer />
    </>
  );
}
