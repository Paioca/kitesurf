import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import { db } from './db';
import { childLogger } from './logger';

const log = childLogger('audit');

// Trilha de auditoria para ações IRREVERSÍVEIS / financeiras.
// Escopo deliberadamente estreito no MVP:
//   - account.delete            (deleteAccount, anonimização LGPD)
//   - deal.confirm_purchase     (deal vira completed)
//   - user.email_changed        (canal de segurança)
//   - user.phone_changed        (futuro — recovery/phone/confirm)
//
// Snapshots em `before`/`after` carregam só os CAMPOS RELEVANTES do contexto, nunca
// o registro Prisma inteiro (evita PII desnecessário no log). Falha silenciosa pra
// não derrubar a operação principal — vai pro Sentry pra a gente reagir.

type Client = PrismaClient | Prisma.TransactionClient;

export interface AuditContext {
  actorUserId?: string | null;
  correlationId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}

export interface AuditInput extends AuditContext {
  action: string;
  entityType: 'user' | 'deal' | 'listing' | string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  result?: 'ok' | 'error';
}

// Aceita PrismaClient ou TransactionClient: chame com `tx` quando quiser que o
// registro suba/desça junto com o resto da transação (deleteAccount, confirmPurchase).
export async function recordAudit(client: Client, input: AuditInput): Promise<void> {
  try {
    await client.auditEvent.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        // Prisma distingue JSON null (Prisma.JsonNull) de SQL null (Prisma.DbNull);
        // ausência do snapshot vira DbNull (coluna NULL no Postgres).
        before: (input.before ?? Prisma.DbNull) as Prisma.InputJsonValue,
        after: (input.after ?? Prisma.DbNull) as Prisma.InputJsonValue,
        correlationId: input.correlationId ?? null,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent ?? null,
        release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        result: input.result ?? 'ok',
      },
    });
  } catch (err) {
    // Quando chamado FORA de transação, queremos falhar silencioso (audit não pode
    // derrubar a ação real). Dentro de tx, o caller é que decide o tratamento — mas
    // como esta função engole, dentro de tx o usuário tem que rethrow se quiser
    // abortar. Em prática, optamos por audit best-effort + alerta no Sentry.
    Sentry.captureException(err, {
      tags: { component: 'audit', action: input.action, entityType: input.entityType },
    });
    log.error({ event: 'record_failed', action: input.action, entityType: input.entityType, entityId: input.entityId, err }, 'audit record failed');
  }
}

// Açúcar quando não há transação — preserva o caller idiomático `recordAudit(db, ...)`.
export const recordAuditNoTx = (input: AuditInput) => recordAudit(db, input);
