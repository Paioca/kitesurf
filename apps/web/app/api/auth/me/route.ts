import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { getCurrentUser, requireUser, clearSession, setSession, UnauthorizedError } from '../../../../lib/session';
import { isOfficialImageUrl } from '../../../../lib/storage';
import { deleteAccount, LifecycleError } from '../../../../lib/lifecycle';
import { SPOTS } from '../../../../lib/filters';
import { recordAuditNoTx } from '../../../../lib/audit';

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
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
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
  email: z.string().email().max(120).nullable().optional(),
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
    // Só zera a verificação quando o endereço realmente mudou.
    const email = dto.email === undefined ? undefined : (dto.email ? dto.email.toLowerCase().trim() : null);
    const emailChanged = email !== undefined && email !== user.email;
    const norm = (v: string | null | undefined) => (v === undefined ? undefined : v ? v.trim() || null : null);
    // spot só da lista controlada; valor fora da lista vira null
    const spot = dto.spot === undefined ? undefined : dto.spot && SPOTS.includes(dto.spot) ? dto.spot : null;
    const updated = await db.user.update({
      where: { id: user.id },
      // Trocar o e-mail muda o canal de recuperação de conta: bump sessionVersion
      // derruba sessões concorrentes (inclusive uma sessão sequestrada). Reemitimos o
      // cookie da sessão atual logo abaixo para o próprio usuário não se deslogar.
      data: { name: dto.name, lastName: norm(dto.lastName), spot, country: norm(dto.country), email, emailVerified: emailChanged ? false : undefined, sessionVersion: emailChanged ? { increment: 1 } : undefined, avatarUrl: dto.avatarUrl, locale: dto.locale },
    });
    if (emailChanged) {
      await setSession(updated.id, updated.sessionVersion);
    }
    // Audit só quando o e-mail (canal de segurança) mudou. Outros campos do perfil não
    // entram no audit no MVP — escopo deliberado: registrar só ações de segurança/PII.
    if (emailChanged) {
      await recordAuditNoTx({
        actorUserId: user.id,
        action: 'user.email_changed',
        entityType: 'user',
        entityId: user.id,
        before: { email: user.email, emailVerified: user.emailVerified },
        after: { email: updated.email, emailVerified: updated.emailVerified },
      });
    }
    return NextResponse.json({ id: updated.id, name: updated.name, lastName: updated.lastName, spot: updated.spot, country: updated.country, email: updated.email, emailVerified: updated.emailVerified, avatarUrl: updated.avatarUrl, locale: updated.locale });
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
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof LifecycleError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
