import 'server-only';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { UnauthorizedError, ForbiddenError } from './session';
import { logger } from './logger';

// Erro com mensagem SEGURA pra mostrar ao usuário (validação/domínio). Os erros de
// domínio (DealError/RequestError) estendem esta classe. Qualquer erro que NÃO seja
// PublicError é tratado como inesperado: vira mensagem genérica + vai pro Sentry,
// pra não vazar detalhe interno (Prisma/Supabase) na resposta.
export class PublicError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface ErrorContext {
  endpoint?: string;
  action?: string;
  userId?: string | null;
  // correlationId é resolvido automaticamente do header injetado pelo middleware;
  // pode ser sobrescrito explicitamente.
  correlationId?: string | null;
}

// Resolve correlationId do middleware quando o caller não passou explícito.
// Falha silenciosa: headers() lança fora de request context (e.g. testes), aí volta null.
async function resolveCorrelationId(): Promise<string | null> {
  try {
    return (await headers()).get('x-correlation-id');
  } catch {
    return null;
  }
}

// Resposta padronizada de erro. Aceita contexto opcional pra:
//  - logar com correlationId/endpoint/userId (queriável no Log Drain)
//  - taggear o evento no Sentry pra agrupar por rota/ação
//
// Erros PUBLIC (validation, domain, auth) não vão pro Sentry — são esperados — mas
// vão pro logger em nível 'info' (queriável sem virar ruído). Erros INESPERADOS vão
// pros dois (Sentry + logger.error) com stack.
export async function errorResponse(e: unknown, ctx: ErrorContext = {}): Promise<NextResponse> {
  const correlationId = ctx.correlationId ?? (await resolveCorrelationId());
  const base = { correlationId, endpoint: ctx.endpoint, action: ctx.action, userId: ctx.userId };

  if (e instanceof UnauthorizedError) {
    logger.info({ ...base, event: 'auth_required' }, 'unauthorized');
    return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
  }
  if (e instanceof ForbiddenError) {
    logger.info({ ...base, event: 'forbidden' }, 'forbidden');
    return NextResponse.json({ message: 'Sem permissão.' }, { status: 403 });
  }
  if (e instanceof PublicError) {
    logger.info({ ...base, event: 'public_error', status: e.status, message: e.message }, 'public_error');
    return NextResponse.json({ message: e.message }, { status: e.status });
  }

  // Inesperado: Sentry + log estruturado com stack.
  Sentry.captureException(e, {
    tags: {
      ...(ctx.endpoint ? { endpoint: ctx.endpoint } : {}),
      ...(ctx.action ? { action: ctx.action } : {}),
    },
    contexts: correlationId ? { request: { correlationId } } : undefined,
  });
  logger.error({ ...base, event: 'unexpected_error', err: e }, 'unexpected error');
  return NextResponse.json({ message: 'Erro inesperado. Tente de novo.' }, { status: 500 });
}
