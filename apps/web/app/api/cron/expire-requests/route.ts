import { NextResponse } from 'next/server';
import { runRequestLifecycle } from '../../../../lib/requests';
import { runJob } from '../../../../lib/jobrun';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// CRON (Vercel Cron, diário) — ciclo de vida do pedido:
//  1) lembra o vendedor de pedidos pendentes há > REQUEST_REMINDER_HOURS (24h) — 1 SMS/pedido;
//  2) expira pedidos pending há > REQUEST_EXPIRE_DAYS (7d) → `expired` + aviso in-app ao comprador.
// Protegido por CRON_SECRET (o Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`).
// Idempotente. Agendamento em vercel.json + JOB_SCHEDULES (lib/jobrun.ts).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }
  try {
    // runJob: linha JobRun + Sentry check-in. Sem lock: Vercel Cron garante 1 invocação por path.
    const outcome = await runJob('expire-requests', () => runRequestLifecycle());
    return NextResponse.json({ ok: true, ...outcome.result });
  } catch (e) {
    return errorResponse(e);
  }
}
