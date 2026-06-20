import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';

const TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);
const IS_PROD = process.env.NODE_ENV === 'production';

// Produção SEMPRE envia SMS de verdade — mock e números de teste só valem fora de
// produção. Isso fecha o bypass: em prod o código nunca volta na resposta, OTP_MOCK
// é ignorado, e telefones de teste recebem SMS real (ou falham) como qualquer outro.
const MOCK = !IS_PROD && process.env.OTP_MOCK === 'true';
// Números de teste (mock fora de prod): código volta na resposta, sem SMS.
//   +5585991000…  → perfis de demo seedados (seed-journey)
//   +5500…        → faixa descartável p/ testar cadastro (DDD 00 não existe, não colide com real)
const TEST_PREFIXES = ['+5585991000', '+5500'];
const isTestPhone = (p: string) => !IS_PROD && TEST_PREFIXES.some((t) => p.startsWith(t));

export const otpIsMock = MOCK;

// Gera OTP, salva o HASH (nunca o código puro) e envia por SMS (Twilio).
// Retorna o código só no caminho mock (dev / número de teste); em produção, null.
// Lança se o envio real falhar — o caller NÃO deve dizer "enviado" sem ter enviado.
export async function generateOtp(phone: string): Promise<string | null> {
  const code = String(crypto.randomInt(100000, 1000000)); // CSPRNG, 6 dígitos
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + TTL * 1000);
  await db.otpCode.create({ data: { phone, codeHash, expiresAt } });

  if (MOCK || isTestPhone(phone)) {
    // eslint-disable-next-line no-console
    console.warn(`[MOCK SMS] OTP para ${phone}: ${code}`);
    return code;
  }

  await sendOtpSms(phone, code);
  return null;
}

// Envio do código via Twilio (mesmo provider do notify.ts). LANÇA se não estiver
// configurado ou se a Twilio recusar — assim o caller não responde "enviado" sem
// ter enviado (fail-closed). O erro é logado e propaga pro route handler tratar.
async function sendOtpSms(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    console.error('[otp] Twilio não configurado — código não enviado');
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
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[otp] sms falhou', res.status, detail);
    throw new Error(`Twilio recusou o envio (${res.status})`);
  }
}

// consume=false só "espia" (valida sem queimar o código) — usado quando a conta
// é nova e ainda falta o onboarding; o código é queimado só na criação (consume=true).
export async function verifyOtp(phone: string, code: string, consume = true): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.attempts >= 5) return false;
  const ok = await bcrypt.compare(code, otp.codeHash);
  await db.otpCode.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 }, consumed: ok && consume ? true : undefined },
  });
  return ok;
}
