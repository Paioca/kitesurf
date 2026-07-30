import { NextResponse } from 'next/server';
import { copyObjectsToR2, rewriteDbUrlsToR2 } from '../../../../lib/migrate-images';
import { errorResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Migração pode baixar/subir muitos objetos — dá a folga máxima do plano.
export const maxDuration = 60;

// POST /api/maintenance/migrate-r2 — migração one-shot das fotos Supabase -> R2.
// Roda DENTRO da Vercel (credenciais de prod já existem no ambiente). Protegido por
// MIGRATE_SECRET (um valor que o DONO escolhe e seta na Vercel) — aceito via
// Authorization: Bearer <secret> OU ?token=<secret>. Sem o env setado → 401 (inerte).
//
// Query:
//   step=copy | db        (obrigatório)  — o que fazer
//   apply=true            (opcional)      — grava de fato; sem isso é dry-run
//   limit=<n>             (opcional, copy)— máx. de objetos a copiar nesta chamada
//
// Ordem recomendada: rodar 'copy' (repetir até remaining=0) e SÓ DEPOIS 'db'.
export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  const url = new URL(req.url);
  const bearer = req.headers.get('authorization');
  const token = url.searchParams.get('token');
  const authed = !!secret && (bearer === `Bearer ${secret}` || token === secret);
  if (!authed) {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  }

  const step = url.searchParams.get('step');
  const apply = url.searchParams.get('apply') === 'true';
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Math.max(1, Math.min(2000, Number(limitRaw) || 0)) : undefined;

  try {
    if (step === 'copy') {
      const result = await copyObjectsToR2({ apply, limit });
      return NextResponse.json({ ok: true, step, apply, result });
    }
    if (step === 'db') {
      const result = await rewriteDbUrlsToR2({ apply });
      return NextResponse.json({ ok: true, step, apply, result });
    }
    return NextResponse.json(
      { message: "Informe ?step=copy ou ?step=db (e ?apply=true pra gravar)." },
      { status: 400 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
