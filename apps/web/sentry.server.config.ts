// Sentry — runtime Node (route handlers, server actions, server components).
// É aqui que enxergamos confirmPurchase, generateOtp/Twilio e os DealError/RequestError.
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isVercelRuntime = !!process.env.VERCEL_ENV;
const sentryDev = process.env.SENTRY_DEV === 'true';
const enabled = !!dsn && (isVercelRuntime || sentryDev);

// Remove parâmetros sensíveis (token de recuperação/verificação, OTP em dev) da URL
// antes de qualquer evento ir pro Sentry. Defesa em profundidade junto com o scrubbing
// do painel. Aplica em request.url de eventos e transações.
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

function isLocalUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  try {
    const host = new URL(rawUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

Sentry.init({
  dsn,
  // Liga no runtime da Vercel; local só com SENTRY_DEV=true (evita ruído de `next start`).
  enabled,
  // VERCEL_ENV (só existe na Vercel) separa preview vs production; FORA da Vercel é sempre
  // 'local' — assim um `next start` local (NODE_ENV=production) não se passa por produção
  // nem polui o painel de produção.
  environment: process.env.VERCEL_ENV ?? 'local',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // 10% de traces em prod (custo), 100% em dev pra inspecionar.
  tracesSampleRate: isProd ? 0.1 : 1.0,
  beforeSend(event) {
    if (isLocalUrl(event.request?.url)) return null;
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
    if (isLocalUrl(event.request?.url)) return null;
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    return event;
  },
});
