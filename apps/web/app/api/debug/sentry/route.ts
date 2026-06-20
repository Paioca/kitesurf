import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORÁRIO — smoke test do Sentry server-side. Lança de propósito pra confirmar
// que o evento chega no painel. REMOVER depois de validar.
export async function GET() {
  try {
    throw new Error('Sentry smoke test — server (Kitetropos). Remover esta rota.');
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000); // garante o envio antes da resposta serverless encerrar
    return NextResponse.json({ ok: true, sent: 'server-error', note: 'Confira no painel do Sentry.' });
  }
}
