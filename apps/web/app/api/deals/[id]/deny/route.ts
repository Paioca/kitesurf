import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { errorResponse } from '../../../../../lib/http';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { denyPurchase, DealError } from '../../../../../lib/deals';
import { LISTINGS_TAG } from '../../../../../lib/browse';

export const runtime = 'nodejs';

// POST — comprador responde "não comprei": cancela o Deal e encerra a solicitação,
// sem marcar o anúncio como vendido (a peça segue disponível).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await denyPurchase(user.id, params.id);
    revalidateTag(LISTINGS_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
