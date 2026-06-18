import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateOtp } from '../../../../../lib/otp';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{7,14}$/) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  // anti SMS-bombing: por telefone e por IP
  const okPhone = await rateLimit(`otp:req:${parsed.data.phone}`, 5, 3600);
  const okIp = await rateLimit(`otp:reqip:${clientIp(req)}`, 20, 3600);
  if (!okPhone || !okIp) return tooMany();

  const devCode = await generateOtp(parsed.data.phone);
  return NextResponse.json({ ok: true, message: 'Código enviado por SMS.', ...(devCode ? { devCode } : {}) });
}
