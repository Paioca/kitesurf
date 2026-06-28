import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../../lib/http';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { rateLimit, tooMany } from '../../../../../lib/ratelimit';
import { correctUnconfirmed, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

// POST — vendedor corrige um encerramento-sem-confirmação ("Corrigir e voltar a
// anunciar"): a peça volta a paused e o deal vira cancelled.
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    if (!(await rateLimit(`deal-mut:${user.id}`, 60, 3600))) return tooMany();
    await correctUnconfirmed(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
