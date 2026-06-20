import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './db';

const TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);

// Produção envia SMS de verdade. Mock só quando OTP_MOCK='true' (dev) OU pro número
// ser de teste (perfis de demo, com telefone fake que não recebe SMS).
const MOCK = process.env.OTP_MOCK === 'true';
// Números de teste seguem em mock (código volta na resposta, sem SMS):
//   +5585991000…  → perfis de demo seedados (seed-journey)
//   +5500…        → faixa descartável p/ testar cadastro (DDD 00 não existe, não colide com real)
const TEST_PREFIXES = ['+5585991000', '+5500'];
const isTestPhone = (p: string) => TEST_PREFIXES.some((t) => p.startsWith(t));

export const otpIsMock = MOCK;

// Gera OTP, salva o HASH (nunca o código puro) e envia por SMS (Twilio).
// Retorna o código só no caminho mock (dev / número de teste); em produção, null.
export async function generateOtp(phone: string): Promise<string | null> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
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

// Envio do código via Twilio (mesmo provider do notify.ts). Sem credenciais → erro
// logado (o usuário não recebe o código, mas o fluxo não quebra de forma silenciosa).
async function sendOtpSms(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    console.error('[otp] Twilio não configurado — código não enviado');
    return;
  }
  const to = (phone.startsWith('+') ? phone : `+${phone}`).replace(/[^\d+]/g, '');
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Kitetropos: seu código é ${code}. Expira em ${Math.round(TTL / 60)} min. Não compartilhe.`,
  });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) console.error('[otp] sms falhou', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[otp] sms erro', e);
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
