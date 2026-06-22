import { NextResponse } from 'next/server';
import { closeUnconfirmedExpired } from '../../../../lib/deals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const closed = await closeUnconfirmedExpired();
  return NextResponse.json({ ok: true, closed });
}
