import { NextResponse } from 'next/server';
import { EmailTokenPurpose } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../../../../lib/db';
import { findValidEmailToken } from '../../../../../../lib/email-security';
import { generateOtp } from '../../../../../../lib/otp';
import { normalizePhone } from '../../../../../../lib/phone';
import { clientIp, rateLimit, tooMany } from '../../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({ token: z.string().min(40).max(100), phone: z.string() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  const emailToken = await findValidEmailToken(parsed.data.token, EmailTokenPurpose.recovery);
  if (!emailToken) return NextResponse.json({ message: 'Este link é inválido ou expirou.' }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: emailToken.userId } });
  if (!user || user.deletedAt || !user.emailVerified || user.email !== emailToken.email) {
    return NextResponse.json({ message: 'Este link não pode mais ser usado.' }, { status: 409 });
  }
  if (phone === user.phone) return NextResponse.json({ message: 'Esse já é o telefone atual da conta.' }, { status: 400 });
  const owner = await db.user.findUnique({ where: { phone } });
  if (owner && owner.id !== user.id) return NextResponse.json({ message: 'Esse telefone já está vinculado a outra conta.' }, { status: 409 });

  // fail-closed: recuperação dispara SMS (custo) e é alvo de brute-force.
  const allowedToken = await rateLimit(`recovery:sms:token:${emailToken.id}`, 5, 3600, { failClosed: true });
  const allowedPhone = await rateLimit(`recovery:sms:phone:${phone}`, 5, 3600, { failClosed: true });
  const allowedIp = await rateLimit(`recovery:sms:ip:${clientIp(req)}`, 15, 3600, { failClosed: true });
  if (!allowedToken || !allowedPhone || !allowedIp) return tooMany();

  try {
    const devCode = await generateOtp(phone, `recovery:${emailToken.id}`);
    return NextResponse.json({ ok: true, message: 'Código enviado por SMS.', ...(devCode ? { devCode } : {}) });
  } catch (error) {
    console.error('[recovery] SMS não enviado', error);
    return NextResponse.json({ message: 'Não foi possível enviar o SMS agora. Tente novamente em instantes.' }, { status: 502 });
  }
}
