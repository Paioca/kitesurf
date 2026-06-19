import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { getCurrentUser, requireUser, clearSession, UnauthorizedError } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 200 });
  return NextResponse.json({
    id: user.id,
    name: user.name,
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
    const ig = dto.instagramHandle === undefined ? undefined : dto.instagramHandle ? dto.instagramHandle.replace(/^@/, '').trim() || null : null;
    // e-mail novo zera a verificação (será confirmado depois); null limpa o campo
    const email = dto.email === undefined ? undefined : (dto.email ? dto.email.toLowerCase().trim() : null);
    const updated = await db.user.update({
      where: { id: user.id },
      data: { name: dto.name, email, emailVerified: email === undefined ? undefined : false, instagramHandle: ig, avatarUrl: dto.avatarUrl, locale: dto.locale },
    });
    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, avatarUrl: updated.avatarUrl, instagramHandle: updated.instagramHandle, locale: updated.locale });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ message: 'Esse e-mail já está em uso por outra conta.' }, { status: 409 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}

// DELETE /api/auth/me — excluir conta (soft). Some os anúncios, anonimiza PII e
// libera telefone/email pra um futuro re-cadastro. Encerra a sessão.
export async function DELETE() {
  try {
    const user = await requireUser();
    const now = new Date();
    await db.$transaction([
      db.listing.updateMany({ where: { userId: user.id, deletedAt: null }, data: { deletedAt: now, status: 'archived' } }),
      db.user.update({
        where: { id: user.id },
        data: {
          deletedAt: now, status: 'blocked',
          name: 'Conta removida', avatarUrl: null, instagramHandle: null,
          phone: `deleted_${user.id}`, email: `deleted_${user.id}@removed.invalid`,
        },
      }),
    ]);
    clearSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}
