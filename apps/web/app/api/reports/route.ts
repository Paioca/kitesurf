import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { requireUser, UnauthorizedError } from '../../../lib/session';
import { rateLimit, tooMany } from '../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({
  targetType: z.enum(['user', 'listing', 'message']),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(500),
});

// Denúncia → fila manual (admin via SQL no MVP).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!(await rateLimit(`report:${user.id}`, 10, 3600))) return tooMany();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    await db.report.create({ data: { reporterId: user.id, ...parsed.data } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    throw e;
  }
}
