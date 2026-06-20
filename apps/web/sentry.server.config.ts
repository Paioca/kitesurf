// Sentry — runtime Node (route handlers, server actions, server components).
// É aqui que enxergamos confirmPurchase, generateOtp/Twilio e os DealError/RequestError.
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Liga em produção sempre; em dev só com SENTRY_DEV=true (evita ruído local).
  enabled: !!dsn && (isProd || process.env.SENTRY_DEV === 'true'),
  environment: process.env.NODE_ENV,
  // 10% de traces em prod (custo), 100% em dev pra inspecionar.
  tracesSampleRate: isProd ? 0.1 : 1.0,
});
