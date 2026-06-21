import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateOtp } from '../../../../../lib/otp';
import { normalizePhone } from '../../../../../lib/phone';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({ phone: z.string() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  // Normaliza pra E.164 canônico ANTES de tudo: a chave de rate-limit e o telefone
  // gravado no OtpCode têm que ser idênticos ao que o verify vai procurar depois.
  const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  // anti SMS-bombing: por telefone e por IP
  const okPhone = await rateLimit(`otp:req:${phone}`, 5, 3600);
  const okIp = await rateLimit(`otp:reqip:${clientIp(req)}`, 20, 3600);
  if (!okPhone || !okIp) return tooMany();

  let devCode: string | null;
  try {
    devCode = await generateOtp(phone);
  } catch (e) {
    console.error('[otp] envio falhou', e);
    return NextResponse.json({ message: 'Não foi possível enviar o SMS agora. Tente novamente em instantes.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: 'Código enviado por SMS.', ...(devCode ? { devCode } : {}) });
}
