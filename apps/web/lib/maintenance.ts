import 'server-only';
import { db } from './db';

// Apaga dados efêmeros que não servem mais:
//  - OtpCode expirado OU já consumido (queries só usam não-consumido e não-expirado).
//  - EmailToken expirado OU já consumido.
//  - RateHit antigo (janelas de rate-limit são <= 1h; 24h é margem segura).
//  - NotificationDelivery já resolvido (sent/failed) há > 7 dias — outbox não cresce
//    sem limite; pending NUNCA é apagado (o drain ainda vai tentar).
export async function purgeEphemeral() {
  const now = new Date();
  const rateCutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const deliveryCutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [otp, emailToken, rate, delivery] = await Promise.all([
    db.otpCode.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumed: true }] } }),
    db.emailToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] } }),
    db.rateHit.deleteMany({ where: { createdAt: { lt: rateCutoff } } }),
    db.notificationDelivery.deleteMany({ where: { status: { in: ['sent', 'failed'] }, createdAt: { lt: deliveryCutoff } } }),
  ]);
  return { otpDeleted: otp.count, emailTokenDeleted: emailToken.count, rateDeleted: rate.count, deliveryDeleted: delivery.count };
}
