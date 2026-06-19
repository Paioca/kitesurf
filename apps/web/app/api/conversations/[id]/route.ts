import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '../../../../lib/session';
import { getConversation, setConversationStatus, ChatError } from '../../../../lib/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — conversa + mensagens (marca como lidas). Usado também no polling.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    return NextResponse.json(await getConversation(user.id, params.id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ChatError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}

// PATCH — bloquear/desbloquear a conversa.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const status = body.status === 'blocked' ? 'blocked' : 'open';
    return NextResponse.json(await setConversationStatus(user.id, params.id, status));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ChatError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
