import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';

export const runtime = 'nodejs';

// POST — favoritar (idempotente).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}

// DELETE — desfavoritar.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await db.favorite.deleteMany({ where: { userId: user.id, listingId: params.id } });
    return NextResponse.json({ ok: true, favorited: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}
