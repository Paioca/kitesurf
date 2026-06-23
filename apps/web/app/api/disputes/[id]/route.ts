import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '../../../../lib/http';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '../../../../lib/session';
import { resolveDispute, DealError } from '../../../../lib/deals';

export const runtime = 'nodejs';

const schema = z.object({ action: z.enum(['uphold', 'reverse']), resolution: z.string().max(1000).optional() });

// POST /api/disputes/[id] — admin resolve uma disputa em análise (§11):
//   { action:'uphold' }  → mantém a venda (Deal volta a completed)
//   { action:'reverse' } → reverte (Deal reversed, peça volta a paused)
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    await resolveDispute(admin.id, params.id, parsed.data.action, parsed.data.resolution);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
