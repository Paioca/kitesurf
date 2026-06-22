import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '../../../../lib/http';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '../../../../lib/session';
import { moderate } from '../../../../lib/moderation';

export const runtime = 'nodejs';

const schema = z.object({
  reportId: z.string().uuid().optional(),
  action: z.enum(['suspend_user', 'restore_user', 'remove_listing', 'restore_listing']),
  targetId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// POST — admin executa uma ação real de moderação (suspender/restaurar usuário,
// remover/restaurar anúncio) + grava a trilha. Substitui o "resolver sem resolver".
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    await moderate(admin.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    return errorResponse(e);
  }
}
