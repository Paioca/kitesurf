import { NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { z } from 'zod';
import { verifyOtp } from '../../../../../../lib/otp';
import { normalizePhone } from '../../../../../../lib/phone';
import { requireUser, UnauthorizedError } from '../../../../../../lib/session';
import { rateLimit, clientIp, tooMany } from '../../../../../../lib/ratelimit';
import { childLogger } from '../../../../../../lib/logger';

const log = childLogger('route:phone/verification/confirm');

export const runtime = 'nodejs';

const schema = z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) });

// POST /api/auth/phone/verification/confirm — confirma o OTP e grava o telefone
// verificado na conta logada. Só aceita OTP do context 'phone-verify'.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

    // anti brute-force do código — por usuário e por IP, fail-closed.
    const okUser = await rateLimit(`phoneverify:confirm:${user.id}`, 10, 3600, { failClosed: true });
    const okIp = await rateLimit(`phoneverify:confirmip:${clientIp(req)}`, 20, 3600, { failClosed: true });
    if (!okUser || !okIp) return tooMany();

    const ok = await verifyOtp({ phone }, parsed.data.code, true, 'phone-verify');
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 400 });

    try {
      await db.user.update({
        where: { id: user.id },
        data: { phone, phoneCountry: phone.startsWith('+55') ? 'BR' : 'INT', phoneVerified: true },
      });
    } catch (e) {
      // Unique: o número foi vinculado a outra conta entre o request e o confirm.
      if ((e as { code?: string }).code === 'P2002') {
        return NextResponse.json({ message: 'Não foi possível usar este telefone.' }, { status: 409 });
      }
      throw e;
    }
    return NextResponse.json({ ok: true, message: 'Telefone verificado.' });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    log.error({ event: 'confirm_failed', err: e }, 'verificação de telefone falhou');
    return NextResponse.json({ message: 'Não foi possível verificar o telefone agora.' }, { status: 500 });
  }
}
