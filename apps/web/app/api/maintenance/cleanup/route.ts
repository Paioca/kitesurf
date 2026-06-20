import { NextResponse } from 'next/server';
import { purgeEphemeral } from '../../../../lib/maintenance';
import { purgeOrphanImages } from '../../../../lib/storage';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/maintenance/cleanup — manutenção agendável (cron). Protegido por
// CRON_SECRET (Bearer). Sem o env setado, o endpoint fica inerte (401).
//   - sempre: purga OtpCode/RateHit velhos (seguro).
//   - imagens órfãs: REPORT-ONLY por padrão; ?purgeOrphans=true pra apagar de fato
//     (com carência de 24h pra não tocar em upload recente).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const purgeOrphans = new URL(req.url).searchParams.get('purgeOrphans') === 'true';
    const ephemeral = await purgeEphemeral();
    const orphans = await purgeOrphanImages({ delete: purgeOrphans });
    return NextResponse.json({ ok: true, ephemeral, orphans });
  } catch (e) {
    return errorResponse(e);
  }
}
