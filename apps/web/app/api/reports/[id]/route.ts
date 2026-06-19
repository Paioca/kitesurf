import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '../../../../lib/session';

export const runtime = 'nodejs';

const schema = z.object({ status: z.enum(['open', 'reviewed', 'actioned']) });

// PATCH — admin muda o status da denúncia (open → reviewed → actioned).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Status inválido.' }, { status: 400 });
    const updated = await db.report.update({ where: { id: params.id }, data: { status: parsed.data.status } });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    throw e;
  }
}
