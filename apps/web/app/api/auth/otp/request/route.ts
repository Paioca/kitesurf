import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../../../../../lib/db';
import { generateOtp } from '../../../../../lib/otp';
import { normalizeEmail } from '../../../../../lib/email-security';
import { normalizePhone } from '../../../../../lib/phone';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';
import { childLogger } from '../../../../../lib/logger';

const log = childLogger('route:otp/request');

export const runtime = 'nodejs';

// Aceita TELEFONE (canal padrão, SMS via Twilio) OU E-MAIL (canal fallback, Resend).
// Por que dois canais: SMS depende de Twilio, que é SPOF — uma queda de Twilio/SMS
// = lockout total. Com e-mail como alternativa, usuário com email verificado tem
// outra rota. Cadastro novo continua só por telefone (não tem como associar email
// a um usuário inexistente sem cair em enumeração de contas).
const schema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
}).refine((d) => Boolean(d.phone) !== Boolean(d.email), {
  message: 'Forneça telefone OU e-mail.',
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Forneça telefone OU e-mail.' }, { status: 400 });

  if (parsed.data.phone) {
    return handlePhone(req, parsed.data.phone);
  }
  return handleEmail(req, parsed.data.email!);
}

async function handlePhone(req: Request, raw: string) {
  // Normaliza pra E.164 canônico ANTES de tudo: a chave de rate-limit e o telefone
  // gravado no OtpCode têm que ser idênticos ao que o verify vai procurar depois.
  const phone = normalizePhone(raw);
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  // anti SMS-bombing: por telefone e por IP. fail-closed: se o banco do rate limiter
  // cair, NÃO liberamos OTP-send — Twilio cobra por SMS e seria abuso direto.
  const okPhone = await rateLimit(`otp:req:${phone}`, 5, 3600, { failClosed: true });
  const okIp = await rateLimit(`otp:reqip:${clientIp(req)}`, 20, 3600, { failClosed: true });
  if (!okPhone || !okIp) return tooMany();

  let devCode: string | null;
  try {
    devCode = await generateOtp({ phone });
  } catch (e) {
    log.error({ event: 'send_failed', channel: 'sms', err: e }, 'OTP send failed');
    return NextResponse.json({ message: 'Não foi possível enviar o SMS agora. Tente novamente em instantes.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, channel: 'sms', message: 'Código enviado por SMS.', ...(devCode ? { devCode } : {}) });
}

const genericEmailOk = NextResponse.json({ ok: true, channel: 'email', message: 'Se houver uma conta com esse e-mail, enviamos um código.' });

async function handleEmail(req: Request, raw: string) {
  const email = normalizeEmail(raw);
  if (!email) return NextResponse.json({ message: 'E-mail inválido.' }, { status: 400 });

  // Hash determinístico do e-mail pra rate-limit: não vaza no log a string crua,
  // e usuários diferentes têm chaves diferentes.
  const emailKey = crypto.createHash('sha256').update(email).digest('hex').slice(0, 24);
  // fail-closed: e-mail OTP é canal de autenticação — proteger custo + abuso.
  const okEmail = await rateLimit(`otp:reqemail:${emailKey}`, 5, 3600, { failClosed: true });
  const okIp = await rateLimit(`otp:reqemailip:${clientIp(req)}`, 20, 3600, { failClosed: true });
  if (!okEmail || !okIp) return tooMany();

  // Verifica que existe um usuário com esse e-mail verificado E ativo.
  // RESPOSTA GENÉRICA: sempre devolve "se houver uma conta" pra NÃO vazar
  // existência de e-mail (enumeração de contas).
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.emailVerified || user.deletedAt || user.status !== 'active') {
    return genericEmailOk;
  }

  try {
    await generateOtp({ email });
  } catch (e) {
    log.error({ event: 'send_failed', channel: 'email', userId: user.id, err: e }, 'OTP email send failed');
    // Mesmo em falha, resposta genérica pra não vazar existência. Sentry/log já registram.
    return genericEmailOk;
  }
  return genericEmailOk;
}
