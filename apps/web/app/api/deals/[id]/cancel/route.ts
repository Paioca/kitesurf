import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { cancelSale, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

// POST — vendedor cancela uma venda marcada por engano (antes da confirmação do comprador).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await cancelSale(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
