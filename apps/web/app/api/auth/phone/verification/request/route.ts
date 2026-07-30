import { NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { z } from 'zod';
import { generateOtp } from '../../../../../../lib/otp';
import { normalizePhone } from '../../../../../../lib/phone';
import { requireUser, UnauthorizedError } from '../../../../../../lib/session';
import { rateLimit, clientIp, tooMany } from '../../../../../../lib/ratelimit';
import { childLogger } from '../../../../../../lib/logger';

const log = childLogger('route:phone/verification/request');

export const runtime = 'nodejs';

const schema = z.object({ phone: z.string() });

// POST /api/auth/phone/verification/request — usuário LOGADO (tipicamente conta
// nascida por e-mail, phone=null) adiciona um telefone: envia OTP por SMS.
// context 'phone-verify' isola do OTP de login — um código deste fluxo nunca loga.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

    if (phone === user.phone && user.phoneVerified) {
      return NextResponse.json({ message: 'Esse já é o telefone verificado da conta.' }, { status: 400 });
    }
    // Mensagem genérica: não confirmar que o número pertence a outra conta (enumeração).
    const owner = await db.user.findUnique({ where: { phone } });
    if (owner && owner.id !== user.id) {
      return NextResponse.json({ message: 'Não foi possível usar este telefone.' }, { status: 409 });
    }

    // anti SMS-bombing — mesmos tetos fail-closed do OTP de login.
    const okPhone = await rateLimit(`phoneverify:req:${phone}`, 5, 3600, { failClosed: true });
    const okUser = await rateLimit(`phoneverify:requser:${user.id}`, 5, 3600, { failClosed: true });
    const okIp = await rateLimit(`phoneverify:reqip:${clientIp(req)}`, 20, 3600, { failClosed: true });
    if (!okPhone || !okUser || !okIp) return tooMany();

    const devCode = await generateOtp({ phone }, 'phone-verify');
    return NextResponse.json({ ok: true, message: 'Código enviado por SMS.', ...(devCode ? { devCode } : {}) });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    log.error({ event: 'send_failed', err: e }, 'OTP de verificação de telefone não enviado');
    return NextResponse.json({ message: 'Não foi possível enviar o SMS agora. Tente novamente em instantes.' }, { status: 502 });
  }
}
