// Carrega a config do Sentry no runtime certo (Node ou Edge).
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura erros de request server-side (no-op em Next < 15; inofensivo).
export const onRequestError = Sentry.captureRequestError;
