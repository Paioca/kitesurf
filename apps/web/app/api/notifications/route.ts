import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '../../../lib/http';
import { requireUser, getCurrentUser, UnauthorizedError } from '../../../lib/session';
import { listNotifications, unreadCount, markRead } from '../../../lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — lista as notificações do usuário + contagem não-lida.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 });
  const [items, unread] = await Promise.all([listNotifications(user.id), unreadCount(user.id)]);
  return NextResponse.json({ items, unread });
}

const patchSchema = z.object({ ids: z.array(z.string()).max(200).optional() });

// PATCH — marca lidas (todas, ou um subconjunto via { ids }).
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    await markRead(user.id, parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
