import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, UnauthorizedError } from '../../../lib/session';
import { findOrCreateConversation, listConversations, ChatError } from '../../../lib/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — minhas conversas
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listConversations(user.id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    throw e;
  }
}

// POST { listingId } — iniciar/abrir conversa (comprador)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = z.object({ listingId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: 'listingId inválido.' }, { status: 400 });
    const id = await findOrCreateConversation(user.id, parsed.data.listingId);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ChatError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
