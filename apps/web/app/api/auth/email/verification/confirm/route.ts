import { NextResponse } from 'next/server';
import { EmailTokenPurpose } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../../../../lib/db';
import { findValidEmailToken } from '../../../../../../lib/email-security';
import { clientIp, rateLimit, tooMany } from '../../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({ token: z.string().min(40).max(100) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: 'Link inválido.' }, { status: 400 });
  // fail-closed: protege contra brute-force de token de confirmação de e-mail.
  if (!(await rateLimit(`email:confirm:ip:${clientIp(req)}`, 20, 3600, { failClosed: true }))) return tooMany();

  const emailToken = await findValidEmailToken(parsed.data.token, EmailTokenPurpose.verify);
  if (!emailToken) return NextResponse.json({ message: 'Este link é inválido ou expirou.' }, { status: 400 });

  const confirmed = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: emailToken.userId } });
    if (!user || user.deletedAt || user.email !== emailToken.email) return false;

    // Consumo condicional: mesmo que duas requisições cheguem juntas, apenas uma
    // consegue usar o token. A segunda recebe count=0 e não altera a conta.
    const consumed = await tx.emailToken.updateMany({
      where: { id: emailToken.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return false;

    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return true;
  });
  if (!confirmed) return NextResponse.json({ message: 'Este e-mail não pertence mais à conta.' }, { status: 409 });
  return NextResponse.json({ ok: true, message: 'E-mail confirmado.' });
}
