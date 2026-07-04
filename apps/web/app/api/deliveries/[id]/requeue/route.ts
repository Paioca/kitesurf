import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '../../../../../lib/http';
import { db } from '../../../../../lib/db';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '../../../../../lib/session';

export const runtime = 'nodejs';

// POST — admin reenfileira UMA entrega de aviso que falhou (failed → pending). O cron
// drain-notifications (*/5min) reenvia. Idempotente e defensivo: updateMany filtrando por
// status='failed' → nunca mexe em pending/sent, e count=0 vira 409 (já não estava falha).
// Reset de attempts/nextAttemptAt dá um ciclo de retry limpo. Sem AuditEvent por ora
// (versão enxuta); a ação é admin-only e reversível.
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    const parsed = z.string().uuid().safeParse(params.id);
    if (!parsed.success) return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });

    const res = await db.notificationDelivery.updateMany({
      where: { id: parsed.data, status: 'failed' },
      data: { status: 'pending', attempts: 0, nextAttemptAt: new Date(), lastError: 'requeued_by_admin' },
    });
    if (res.count === 0) return NextResponse.json({ message: 'Entrega não encontrada ou já não está falha.' }, { status: 409 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    return errorResponse(e);
  }
}
