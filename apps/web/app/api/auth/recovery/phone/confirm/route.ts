import { NextResponse } from 'next/server';
import { EmailTokenPurpose } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../../../../lib/db';
import { findValidEmailToken } from '../../../../../../lib/email-security';
import { verifyOtp } from '../../../../../../lib/otp';
import { normalizePhone } from '../../../../../../lib/phone';
import { clientIp, rateLimit, tooMany } from '../../../../../../lib/ratelimit';
import { setSession } from '../../../../../../lib/session';

export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().min(40).max(100),
  phone: z.string(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });
  // fail-closed: confirma OTP de recuperação — alvo de brute-force, não relaxar.
  if (!(await rateLimit(`recovery:confirm:ip:${clientIp(req)}`, 20, 3600, { failClosed: true }))) return tooMany();

  const emailToken = await findValidEmailToken(parsed.data.token, EmailTokenPurpose.recovery);
  if (!emailToken) return NextResponse.json({ message: 'Este link é inválido ou expirou.' }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: emailToken.userId } });
  if (!user || user.deletedAt || !user.emailVerified || user.email !== emailToken.email) {
    return NextResponse.json({ message: 'Este link não pode mais ser usado.' }, { status: 409 });
  }
  const owner = await db.user.findUnique({ where: { phone } });
  if (owner && owner.id !== user.id) return NextResponse.json({ message: 'Esse telefone já está vinculado a outra conta.' }, { status: 409 });

  const validOtp = await verifyOtp(phone, parsed.data.code, true, `recovery:${emailToken.id}`);
  if (!validOtp) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 400 });

  try {
    const updated = await db.$transaction(async (tx) => {
      // O token é queimado antes da troca. O update condicional torna o link de
      // uso único mesmo sob duas confirmações concorrentes.
      const consumed = await tx.emailToken.updateMany({
        where: { id: emailToken.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new RecoveryTokenUsedError();

      const changed = await tx.user.update({
        where: { id: user.id },
        data: {
          phone,
          phoneCountry: phone.startsWith('+55') ? 'BR' : 'INT',
          phoneVerified: true,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.emailToken.updateMany({
        where: { userId: user.id, purpose: EmailTokenPurpose.recovery, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      return changed;
    });
    await setSession(updated.id, updated.sessionVersion);
    return NextResponse.json({ ok: true, message: 'Telefone atualizado. Sua conta foi recuperada.' });
  } catch (error) {
    if (error instanceof RecoveryTokenUsedError) {
      return NextResponse.json({ message: 'Este link já foi usado ou expirou.' }, { status: 409 });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ message: 'Esse telefone já está vinculado a outra conta.' }, { status: 409 });
    }
    console.error('[recovery] telefone não atualizado', error);
    return NextResponse.json({ message: 'Não foi possível atualizar o telefone agora.' }, { status: 500 });
  }
}

class RecoveryTokenUsedError extends Error {}
