import { NextResponse } from 'next/server';
import { errorResponse } from '../../../lib/http';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { requireUser, requireAdmin, UnauthorizedError, ForbiddenError } from '../../../lib/session';
import { rateLimit, tooMany } from '../../../lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — fila de denúncias (admin). ?status=open|reviewed|actioned (default: todas).
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get('status');
    const reports = await db.report.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { reporter: { select: { id: true, name: true } } },
    });
    return NextResponse.json(reports);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
    return errorResponse(e);
  }
}

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
    const { targetType, targetId } = parsed.data;
    // O alvo PRECISA existir — senão a fila de moderação vira lixeira de IDs inventados.
    const exists =
      targetType === 'user' ? await db.user.count({ where: { id: targetId } })
      : targetType === 'listing' ? await db.listing.count({ where: { id: targetId, deletedAt: null } })
      : await db.message.count({ where: { id: targetId } });
    if (!exists) return NextResponse.json({ message: 'Conteúdo não encontrado.' }, { status: 404 });
    // Ninguém denuncia a própria conta (ruído puro).
    if (targetType === 'user' && targetId === user.id) return NextResponse.json({ message: 'Você não pode denunciar a própria conta.' }, { status: 400 });
    await db.report.create({ data: { reporterId: user.id, ...parsed.data } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
