import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './db';

const TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);
const MOCK = (process.env.OTP_MOCK ?? 'true') === 'true';

export const otpIsMock = MOCK;

// Gera OTP, salva o HASH (nunca o código puro) e "envia".
// No mock, retorna o código pra facilitar teste sem SMS.
export async function generateOtp(phone: string): Promise<string | null> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + TTL * 1000);
  await db.otpCode.create({ data: { phone, codeHash, expiresAt } });

  if (MOCK) {
    // eslint-disable-next-line no-console
    console.warn(`[MOCK SMS] OTP para ${phone}: ${code}`);
    return code;
  }
  // TODO: provider real de SMS (Zenvia/Twilio) no lançamento.
  return null;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.attempts >= 5) return false;
  const ok = await bcrypt.compare(code, otp.codeHash);
  await db.otpCode.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 }, consumed: ok ? true : undefined },
  });
  return ok;
}
