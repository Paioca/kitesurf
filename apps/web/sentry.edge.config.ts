// Sentry — runtime Edge (middleware / rotas edge, se houver).
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const SENSITIVE_PARAMS = ['token', 'code', 'otp', 'devCode'];
function scrubUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    let touched = false;
    for (const k of SENSITIVE_PARAMS) {
      if (u.searchParams.has(k)) {
        u.searchParams.set(k, '[REDACTED]');
        touched = true;
      }
    }
    return touched ? u.toString() : rawUrl;
  } catch {
    return rawUrl;
  }
}

Sentry.init({
  dsn,
  enabled: !!dsn && (isProd || process.env.SENTRY_DEV === 'true'),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  beforeSend(event) {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h.authorization;
      delete h.cookie;
      delete h.Authorization;
      delete h.Cookie;
    }
    return event;
  },
  beforeSendTransaction(event) {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    return event;
  },
});
