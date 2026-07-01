import { NextResponse } from 'next/server';
import { closeUnconfirmedExpired } from '../../../../lib/deals';
import { runJob } from '../../../../lib/jobrun';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// O sweep pagina em lotes com orçamento de ~50s; maxDuration dá folga sob isso.
export const maxDuration = 60;

// CRON (Vercel Cron, diário) — encerra como vendido-sem-confirmação os deals
// seller_confirmed cujo prazo de 72h venceu. Protegido por CRON_SECRET: o Vercel Cron
// envia `Authorization: Bearer <CRON_SECRET>` quando a env existe. Idempotente.
// Agendamento em vercel.json. TODO(v2): lembrete de 48h (precisa de flag remindedAt).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }
  try {
    // runJob: linha JobRun + Sentry check-in (alerta se o job parar de rodar).
    // Sem execução concorrente: Vercel Cron já garante 1 invocação por vez por path.
    const outcome = await runJob('close-unconfirmed', () => closeUnconfirmedExpired());
    return NextResponse.json({ ok: true, closed: outcome.result });
  } catch (e) {
    return errorResponse(e);
  }
}
