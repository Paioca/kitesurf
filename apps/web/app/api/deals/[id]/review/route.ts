import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { createReview, DealError } from '../../../../../lib/deals';

export const runtime = 'nodejs';

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional(), tags: z.array(z.string().max(40)).max(8).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    await createReview(user.id, params.id, parsed.data.rating, parsed.data.comment, parsed.data.tags);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof DealError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
