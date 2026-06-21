import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../../lib/http';
import { z } from 'zod';
import { createRequest, RequestError } from '../../../../../lib/requests';
import { requireUser, UnauthorizedError } from '../../../../../lib/session';
import { rateLimit, tooMany } from '../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({ type: z.enum(['offer', 'visit']), amount: z.number().int().min(100).optional(), component: z.enum(['conjunto', 'kite', 'barra']).default('conjunto') });

// POST /api/listings/[id]/request — comprador faz oferta (com valor) ou pede visita.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    // Burst guard (30/h) + cap de SEGURANÇA diário (20/dia) anti-abuso — cobre oferta+visita.
    // Janela 23h (< retenção de 24h do purge) pra não ler hits na borda da limpeza.
    if (!(await rateLimit(`request:${user.id}`, 30, 3600))) return tooMany();
    if (!(await rateLimit(`offer:day:${user.id}`, 20, 82800))) return tooMany();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const r = await createRequest(user.id, params.id, parsed.data.type, parsed.data.amount, parsed.data.component);
    return NextResponse.json({ ok: true, id: r.id, status: r.status }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof RequestError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
