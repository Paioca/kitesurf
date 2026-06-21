import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { getCurrentUser, requireUser, clearSession, UnauthorizedError } from '../../../../lib/session';
import { isOfficialImageUrl } from '../../../../lib/storage';
import { deleteAccount, LifecycleError } from '../../../../lib/lifecycle';
import { SPOTS } from '../../../../lib/filters';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 200 });
  return NextResponse.json({
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    spot: user.spot,
    country: user.country,
    email: user.email,
    avatarUrl: user.avatarUrl,
    instagramHandle: user.instagramHandle,
    phoneVerified: user.phoneVerified,
    locale: user.locale,
    role: user.role,
  });
}

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  lastName: z.string().max(80).nullable().optional(),
  spot: z.string().max(80).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(), // coletado no perfil; validação (confirmação) fica pra depois
  instagramHandle: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().min(1).optional(),
  locale: z.enum(['pt', 'en']).optional(),
});

// PATCH /api/auth/me — editar o próprio perfil.
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;
    if (dto.avatarUrl !== undefined && !isOfficialImageUrl(dto.avatarUrl)) {
      return NextResponse.json({ message: 'Foto de perfil inválida.' }, { status: 400 });
    }
    const ig = dto.instagramHandle === undefined ? undefined : dto.instagramHandle ? dto.instagramHandle.replace(/^@/, '').trim() || null : null;
    // e-mail novo zera a verificação (será confirmado depois); null limpa o campo
    const email = dto.email === undefined ? undefined : (dto.email ? dto.email.toLowerCase().trim() : null);
    const norm = (v: string | null | undefined) => (v === undefined ? undefined : v ? v.trim() || null : null);
    // spot só da lista controlada; valor fora da lista vira null
    const spot = dto.spot === undefined ? undefined : dto.spot && SPOTS.includes(dto.spot) ? dto.spot : null;
    const updated = await db.user.update({
      where: { id: user.id },
      data: { name: dto.name, lastName: norm(dto.lastName), spot, country: norm(dto.country), email, emailVerified: email === undefined ? undefined : false, instagramHandle: ig, avatarUrl: dto.avatarUrl, locale: dto.locale },
    });
    return NextResponse.json({ id: updated.id, name: updated.name, lastName: updated.lastName, spot: updated.spot, country: updated.country, email: updated.email, avatarUrl: updated.avatarUrl, instagramHandle: updated.instagramHandle, locale: updated.locale });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ message: 'Esse e-mail já está em uso por outra conta.' }, { status: 409 });
    return errorResponse(e);
  }
}

// DELETE /api/auth/me — excluir conta (soft). Encerra pedidos abertos, some os anúncios,
// anonimiza PII e libera telefone/email pra re-cadastro (lógica em deleteAccount).
// Bloqueia se há venda aguardando confirmação. Encerra a sessão.
export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteAccount(user.id);
    clearSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof LifecycleError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
