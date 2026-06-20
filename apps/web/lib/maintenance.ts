import 'server-only';
import { db } from './db';

// Apaga dados efêmeros que não servem mais:
//  - OtpCode expirado OU já consumido (queries só usam não-consumido e não-expirado).
//  - RateHit antigo (janelas de rate-limit são <= 1h; 24h é margem segura).
export async function purgeEphemeral() {
  const now = new Date();
  const rateCutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const [otp, rate] = await Promise.all([
    db.otpCode.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumed: true }] } }),
    db.rateHit.deleteMany({ where: { createdAt: { lt: rateCutoff } } }),
  ]);
  return { otpDeleted: otp.count, rateDeleted: rate.count };
}
