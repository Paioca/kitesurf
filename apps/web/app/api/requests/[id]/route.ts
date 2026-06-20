import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { z } from 'zod';
import { setRequestStatus, cancelRequest, RequestError } from '../../../../lib/requests';
import { requireUser, UnauthorizedError } from '../../../../lib/session';

export const runtime = 'nodejs';

const schema = z.object({ status: z.enum(['accepted', 'declined']) });

// PATCH /api/requests/[id] — vendedor aceita (libera WhatsApp) ou recusa.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    return NextResponse.json(await setRequestStatus(user.id, params.id, parsed.data.status));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof RequestError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}

// DELETE /api/requests/[id] — comprador retira a própria oferta/visita pendente.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    return NextResponse.json(await cancelRequest(user.id, params.id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
