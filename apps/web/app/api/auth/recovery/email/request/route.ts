import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { EmailTokenPurpose } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../../../../lib/db';
import { issueEmailToken, normalizeEmail, sendSecurityEmail } from '../../../../../../lib/email-security';
import { clientIp, rateLimit, tooMany } from '../../../../../../lib/ratelimit';
import { childLogger } from '../../../../../../lib/logger';

const log = childLogger('route:recovery/email/request');

export const runtime = 'nodejs';

const schema = z.object({ email: z.string() });
const generic = () => NextResponse.json({ ok: true, message: 'Se houver uma conta confirmada com esse e-mail, você receberá um link para continuar.' });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const email = parsed.success ? normalizeEmail(parsed.data.email) : null;
  if (!email) return NextResponse.json({ message: 'Digite um e-mail válido.' }, { status: 400 });

  const emailKey = crypto.createHash('sha256').update(email).digest('hex').slice(0, 24);
  // fail-closed: e-mail de recuperação inicia mudança de telefone — proteção crítica.
  const allowedEmail = await rateLimit(`recovery:email:${emailKey}`, 3, 3600, { failClosed: true });
  const allowedIp = await rateLimit(`recovery:email:ip:${clientIp(req)}`, 10, 3600, { failClosed: true });
  if (!allowedEmail || !allowedIp) return tooMany();

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.emailVerified || user.deletedAt || user.status !== 'active') return generic();

  const { raw, token } = await issueEmailToken(user.id, email, EmailTokenPurpose.recovery);
  try {
    await sendSecurityEmail({ to: email, name: user.name, purpose: EmailTokenPurpose.recovery, rawToken: raw });
  } catch (error) {
    await db.emailToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }).catch(() => undefined);
    log.error({ event: 'email_not_sent', userId: user.id, err: error }, 'e-mail não enviado');
  }
  return generic();
}
