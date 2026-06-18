import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { sendMessage, ChatError } from '../../../../../lib/chat';

export const runtime = 'nodejs';

const schema = z.object({ body: z.string().max(2000).optional(), imageUrl: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const msg = await sendMessage(user.id, params.id, parsed.data.body ?? '', parsed.data.imageUrl);
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ChatError) return NextResponse.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
