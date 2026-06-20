// Sentry — runtime Edge (middleware / rotas edge, se houver).
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn && (isProd || process.env.SENTRY_DEV === 'true'),
  environment: process.env.NODE_ENV,
  tracesSampleRate: isProd ? 0.1 : 1.0,
});
