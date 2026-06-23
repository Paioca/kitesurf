// Sentry — runtime browser. Carregado automaticamente pelo Next (App Router).
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Recovery/verificação trafegam o token na URL (?token=...). Replay-on-error (100%)
// e traces capturam a URL inteira por padrão — limpamos antes do envio.
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
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  // Session Replay: 5% das sessões em prod + 100% das que tiveram erro.
  replaysSessionSampleRate: isProd ? 0.05 : 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  beforeSend(event) {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    return event;
  },
  beforeSendTransaction(event) {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    return event;
  },
  beforeBreadcrumb(crumb) {
    // Breadcrumbs de navegação também carregam a URL.
    if (crumb.category === 'navigation' || crumb.category === 'fetch' || crumb.category === 'xhr') {
      if (typeof crumb.data?.to === 'string') crumb.data.to = scrubUrl(crumb.data.to);
      if (typeof crumb.data?.from === 'string') crumb.data.from = scrubUrl(crumb.data.from);
      if (typeof crumb.data?.url === 'string') crumb.data.url = scrubUrl(crumb.data.url);
    }
    return crumb;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
