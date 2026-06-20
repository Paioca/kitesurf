// Sentry — runtime browser. Carregado automaticamente pelo Next (App Router).
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn && (isProd || process.env.SENTRY_DEV === 'true'),
  environment: process.env.NODE_ENV,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  // Session Replay: 5% das sessões em prod + 100% das que tiveram erro.
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
