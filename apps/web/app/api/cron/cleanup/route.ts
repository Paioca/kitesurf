import { NextResponse } from 'next/server';
import { purgeEphemeral } from '../../../../lib/maintenance';
import { purgeOrphanImages } from '../../../../lib/storage';
import { runJob } from '../../../../lib/jobrun';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Cron pode rodar até 60s — orphan scan + purge precisa de folga.
export const maxDuration = 60;

// Cron diário (vercel.json → 03:00 BRT). Autenticação:
//   - Vercel Cron injeta `Authorization: Bearer ${CRON_SECRET}` automaticamente
//     quando CRON_SECRET está nas env vars do projeto (formato oficial Vercel).
//   - Manual via curl: mesmo header.
// Sem secret/auth inválido → 401. Sem env CRON_SECRET → endpoint inerte.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }
  try {
    // ?purgeOrphans=true por padrão no cron (queremos deletar, não só reportar);
    // dá pra desligar no schedule (vercel.json) se algum dia for caro demais.
    const purgeOrphans = new URL(req.url).searchParams.get('purgeOrphans') !== 'false';
    const outcome = await runJob('cleanup', async () => {
      const ephemeral = await purgeEphemeral();
      const orphans = await purgeOrphanImages({ delete: purgeOrphans });
      return { ephemeral, orphans };
    });
    if (outcome.skipped) return NextResponse.json({ ok: true, skipped: true, reason: 'already running' });
    return NextResponse.json({ ok: true, ...outcome.result });
  } catch (e) {
    return errorResponse(e);
  }
}
