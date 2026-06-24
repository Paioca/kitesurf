import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { childLogger } from './logger';

const log = childLogger('otp');

const TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);
const IS_PROD = process.env.NODE_ENV === 'production';

// Produção SEMPRE envia OTP de verdade — mock e números de teste só valem fora de
// produção. Isso fecha o bypass: em prod o código nunca volta na resposta, OTP_MOCK
// é ignorado, e telefones de teste recebem SMS real (ou falham) como qualquer outro.
const MOCK = !IS_PROD && process.env.OTP_MOCK === 'true';
// Números de teste (mock fora de prod): código volta na resposta, sem SMS.
//   +5585991000…  → perfis de demo seedados (seed-journey)
//   +5500…        → faixa descartável p/ testar cadastro (DDD 00 não existe, não colide com real)
const TEST_PREFIXES = ['+5585991000', '+5500'];
const isTestPhone = (p: string) => !IS_PROD && TEST_PREFIXES.some((t) => p.startsWith(t));

export const otpIsMock = MOCK;

// Identificador do canal — UM dos dois é exclusivo. O schema do banco tem CHECK
// constraint que garante (CHECK (phone IS NOT NULL) <> (email IS NOT NULL)).
export type OtpTarget = { phone: string } | { email: string };

// Gera OTP, salva o HASH (nunca o código puro) e envia pelo canal correspondente.
// Retorna o código só no caminho mock (dev / número de teste); em produção, null.
// Lança se o envio real falhar — o caller NÃO deve dizer "enviado" sem ter enviado.
export async function generateOtp(target: OtpTarget, context = 'login'): Promise<string | null> {
  const code = String(crypto.randomInt(100000, 1000000)); // CSPRNG, 6 dígitos
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + TTL * 1000);

  const data: { codeHash: string; expiresAt: Date; context: string; phone?: string; email?: string } = {
    codeHash,
    expiresAt,
    context,
  };
  if ('phone' in target) data.phone = target.phone;
  else data.email = target.email;
  await db.otpCode.create({ data });

  // Mock path (dev only) — código sai no log + retorno pro route só mostrar em dev.
  if ('phone' in target && (MOCK || isTestPhone(target.phone))) {
    log.warn({ event: 'mock_sms', phone: target.phone, code }, 'mock SMS — dev only');
    return code;
  }
  if ('email' in target && MOCK) {
    log.warn({ event: 'mock_email', email: target.email, code }, 'mock e-mail — dev only');
    return code;
  }

  if ('phone' in target) await sendOtpSms(target.phone, code);
  else await sendOtpEmail(target.email, code);
  return null;
}

// Envio do código via Twilio (SMS). LANÇA se não estiver configurado ou se a Twilio
// recusar — assim o caller não responde "enviado" sem ter enviado (fail-closed).
async function sendOtpSms(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    log.error({ event: 'sms_not_configured' }, 'Twilio não configurado — código não enviado');
    throw new Error('SMS provider não configurado');
  }
  const to = (phone.startsWith('+') ? phone : `+${phone}`).replace(/[^\d+]/g, '');
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Kitetropos: seu código é ${code}. Expira em ${Math.round(TTL / 60)} min. Não compartilhe.`,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(4000), // login não pode pendurar se a Twilio travar
  });
  if (!res.ok) {
    // Não logar res.text(): erros de validação da Twilio (e.g. 21211) ecoam o telefone.
    log.error({ event: 'sms_send_failed', status: res.status, providerRequestId: res.headers.get('twilio-request-id') ?? null }, 'twilio recusou envio');
    throw new Error(`Twilio recusou o envio (${res.status})`);
  }
}

// Envio do código por e-mail via Resend — o FALLBACK do SPOF do Twilio. Mesma
// semântica fail-closed: lança em provider down ou config faltando. PII (e-mail
// destinatário) NÃO vai pro log; só status + request-id do provedor.
async function sendOtpEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    log.error({ event: 'email_not_configured' }, 'Resend não configurado — código não enviado');
    throw new Error('e-mail provider não configurado');
  }
  const minutes = Math.round(TTL / 60);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Kitetropos/1.0',
      // Idempotency key: mesmo código (hash) gera mesmo key — o Resend deduplica
      // entregas duplicadas se o caller reenviar por erro de rede.
      'Idempotency-Key': `otp-${crypto.createHash('sha256').update(`${email}:${code}`).digest('hex').slice(0, 32)}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Seu código de login Kitetropos',
      text: `Seu código de acesso é ${code}.\n\nExpira em ${minutes} minutos. Se você não pediu, ignore.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#23332e"><h1 style="font-size:26px">Seu código de acesso</h1><p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f0ece4;padding:16px 20px;border-radius:10px;text-align:center;margin:24px 0">${code}</p><p style="line-height:1.6">Digite este código na tela de login. Ele expira em ${minutes} minutos.</p><p style="font-size:13px;color:#6b7a73">Se você não pediu, ignore este e-mail. Ninguém da Kitetropos vai pedir esse código pra você.</p></div>`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    log.error({ event: 'email_send_failed', status: res.status, providerRequestId: res.headers.get('x-resend-request-id') ?? null }, 'resend recusou envio');
    throw new Error(`Resend recusou o envio (${res.status})`);
  }
}

// consume=false só "espia" (valida sem queimar o código) — usado quando a conta
// é nova e ainda falta o onboarding; o código é queimado só na criação (consume=true).
// Aceita phone OU email — busca o último OTP pendente do canal correspondente.
export async function verifyOtp(target: OtpTarget, code: string, consume = true, context = 'login'): Promise<boolean> {
  const where = 'phone' in target
    ? { phone: target.phone, context, consumed: false, expiresAt: { gt: new Date() } }
    : { email: target.email, context, consumed: false, expiresAt: { gt: new Date() } };
  const otp = await db.otpCode.findFirst({ where, orderBy: { createdAt: 'desc' } });
  if (!otp) return false;

  // Cobra a tentativa de forma ATÔMICA antes de comparar. O read-then-increment antigo
  // era TOCTOU (CWE-367): N requests concorrentes liam attempts<5 e todas passavam,
  // furando o teto de 5 chutes por código. O updateMany condicional (WHERE attempts<5)
  // serializa no índice do banco — no máximo 5 tentativas "ganham" a linha. Espelha o
  // padrão de upsert atômico já usado em lib/ratelimit.ts.
  const claim = await db.otpCode.updateMany({
    where: { id: otp.id, attempts: { lt: 5 }, consumed: false },
    data: { attempts: { increment: 1 } },
  });
  if (claim.count !== 1) return false; // já esgotou as 5 tentativas (ou foi consumido)

  const ok = await bcrypt.compare(code, otp.codeHash);
  // Queima o código só no acerto+consume, também de forma condicional (uso único real).
  if (ok && consume) {
    await db.otpCode.updateMany({ where: { id: otp.id, consumed: false }, data: { consumed: true } });
  }
  return ok;
}
