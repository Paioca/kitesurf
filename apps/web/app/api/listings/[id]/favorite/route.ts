import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../../lib/http';
import { db } from '../../../../../lib/db';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';

export const runtime = 'nodejs';

// POST — favoritar (idempotente).
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    await db.favorite.upsert({
      where: { userId_listingId: { userId: user.id, listingId: params.id } },
      update: {},
      create: { userId: user.id, listingId: params.id },
    });
    return NextResponse.json({ ok: true, favorited: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}

// DELETE — desfavoritar.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    await db.favorite.deleteMany({ where: { userId: user.id, listingId: params.id } });
    return NextResponse.json({ ok: true, favorited: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
