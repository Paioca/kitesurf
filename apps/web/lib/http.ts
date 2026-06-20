import 'server-only';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { UnauthorizedError, ForbiddenError } from './session';

// Erro com mensagem SEGURA pra mostrar ao usuário (validação/domínio). Os erros de
// domínio (DealError/RequestError) estendem esta classe. Qualquer erro que NÃO seja
// PublicError é tratado como inesperado: vira mensagem genérica + vai pro Sentry,
// pra não vazar detalhe interno (Prisma/Supabase) na resposta.
export class PublicError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
  if (e instanceof PublicError) return NextResponse.json({ message: e.message }, { status: e.status });
  Sentry.captureException(e);
  // eslint-disable-next-line no-console
  console.error('[api] erro inesperado', e);
  return NextResponse.json({ message: 'Erro inesperado. Tente de novo.' }, { status: 500 });
}
