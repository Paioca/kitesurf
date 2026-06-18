import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { confirmSale, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

// POST — vendedor confirma a venda desta conversa (cria o Deal).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const dealId = await confirmSale(user.id, params.id);
    return NextResponse.json({ dealId }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
