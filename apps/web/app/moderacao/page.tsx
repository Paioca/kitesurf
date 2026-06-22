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

export const dynamic = 'force-dynamic';

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
    reporter: r.reporter?.name ?? '—',
    targetState: targetState(r),
    actions: r.actions.map((a) => ({ action: a.action, by: a.moderator?.name ?? '—', at: a.createdAt.toISOString(), note: a.note })),
  }));

  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 6px' }}>Moderação</h1>
        <p style={{ fontSize: 14.5, color: color.inkMute, margin: '0 0 24px' }}>Denúncias recebidas. {reports.filter((r) => r.status === 'open').length} aberta(s).</p>
        <ModerationList reports={reports} />
      </main>
      <Footer />
    </>
  );
}
