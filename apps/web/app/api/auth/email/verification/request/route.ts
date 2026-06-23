import { NextResponse } from 'next/server';
import { EmailTokenPurpose } from '@prisma/client';
import { issueEmailToken, sendSecurityEmail } from '../../../../../../lib/email-security';
import { clientIp, rateLimit, tooMany } from '../../../../../../lib/ratelimit';
import { requireUser, UnauthorizedError } from '../../../../../../lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user.email) return NextResponse.json({ message: 'Adicione e salve um e-mail antes de confirmar.' }, { status: 400 });
    if (user.emailVerified) return NextResponse.json({ ok: true, message: 'Seu e-mail já está confirmado.' });

    // fail-closed: confirmação de e-mail é gate de canal de segurança.
    const allowedUser = await rateLimit(`email:verify:user:${user.id}`, 3, 3600, { failClosed: true });
    const allowedIp = await rateLimit(`email:verify:ip:${clientIp(req)}`, 10, 3600, { failClosed: true });
    if (!allowedUser || !allowedIp) return tooMany();

    const { raw, token } = await issueEmailToken(user.id, user.email, EmailTokenPurpose.verify);
    try {
      await sendSecurityEmail({ to: user.email, name: user.name, purpose: EmailTokenPurpose.verify, rawToken: raw });
    } catch (error) {
      await import('../../../../../../lib/db').then(({ db }) => db.emailToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } })).catch(() => undefined);
      console.error('[email] confirmação não enviada', error);
      return NextResponse.json({ message: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: 'Enviamos o link de confirmação para seu e-mail.' });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    console.error('[email] erro ao solicitar confirmação', error);
    return NextResponse.json({ message: 'Não foi possível enviar o e-mail agora.' }, { status: 500 });
  }
}
