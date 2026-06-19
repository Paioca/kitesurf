import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { confirmSaleFromRequest, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

// POST /api/requests/[id]/sold — vendedor marca a venda pro comprador do pedido.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const dealId = await confirmSaleFromRequest(user.id, params.id);
    return NextResponse.json({ ok: true, dealId });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
