import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '../../../../../lib/http';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { requestReversal, respondReversal, cancelReversal, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

const schema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('request'), reason: z.enum(['devolvido', 'engano', 'nao_aconteceu', 'outro']), description: z.string().max(1000).optional() }),
  z.object({ op: z.literal('respond'), accept: z.boolean() }),
  z.object({ op: z.literal('cancel') }),
]);

// POST — fluxo de reversão/correção de uma venda confirmada (§11):
//   { op:'request', reason, description? } — uma parte pede a correção
//   { op:'respond', accept }              — a outra aceita (reversed) ou recusa (disputed)
//   { op:'cancel' }                       — quem pediu desiste (volta a completed)
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;
    if (dto.op === 'request') await requestReversal(user.id, params.id, dto.reason, dto.description);
    else if (dto.op === 'respond') await respondReversal(user.id, params.id, dto.accept);
    else await cancelReversal(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
