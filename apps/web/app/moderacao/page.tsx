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
    include: { reporter: { select: { name: true } } },
  });
  const reports = raw.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter?.name ?? '—',
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
