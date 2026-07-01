import { NextResponse } from 'next/server';
import { drainNotificationDeliveries } from '../../../../lib/notify';
import { runJob } from '../../../../lib/jobrun';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Drena o outbox em lotes com orçamento de ~50s; maxDuration dá folga sob isso.
export const maxDuration = 60;

// CRON (Vercel Cron) — reenvia as entregas Twilio que falharam de forma transitória
// (outbox NotificationDelivery, status=pending). Frequente porque é retry de SMS/WhatsApp
// que devem chegar logo. Protegido por CRON_SECRET. runJob = JobRun + Sentry check-in.
// No-op barato quando o outbox está vazio (Twilio saudável → nada enfileirado).
// Sem execução concorrente: Vercel Cron já garante 1 invocação por vez por path.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const outcome = await runJob('drain-notifications', () => drainNotificationDeliveries());
    return NextResponse.json({ ok: true, ...outcome.result });
  } catch (e) {
    return errorResponse(e);
  }
}
