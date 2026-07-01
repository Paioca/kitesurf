import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { db } from './db';
import { childLogger } from './logger';

const log = childLogger('jobrun');

// Envoltório de execução de job: cria linha JobRun(status=running), chama o trabalho,
// fecha como ok|error com o resultado. Integra com Sentry Crons (captureCheckIn) pra
// o painel saber "rodou? quando?". Idempotente em relação a falhas: se o handler
// lançar, a linha vira status=error e a exceção propaga pro caller.
//
// CONCORRÊNCIA: Vercel Cron já garante "uma execução por vez por path" — invocações
// novas são puladas se a anterior ainda está rodando. Antes a gente tinha um
// pg_try_advisory_lock(hashtext(job)) aqui como camada extra, mas advisory_lock é
// SESSION-LEVEL e o Supabase está em pgbouncer transaction-mode: a "session" PG tem
// vida curta e o lock fica ÓRFÃO preso em conexões devolvidas ao pool. Resultado:
// toda invocação tentava pegar e falhava em `pg_try_advisory_lock`, caía no
// `return { skipped: true }`, e NUNCA criava linha em JobRun. Removido. Se um dia
// quisermos blindar contra "curl manual em paralelo", a forma certa é xact-level
// lock dentro de uma transação curta que pega o lock E grava a linha JobRun juntos.
//
// Schedules dos crons (espelham apps/web/vercel.json). Necessários pro Sentry CRIAR/casar o
// monitor via upsert na 1ª check-in — sem o monitorConfig o Sentry responde "monitor not found"
// e REJEITA o check-in (era o caso: nenhum monitor job-* existia e o alerta de cron-parado não
// funcionava). Mantenha em sincronia com vercel.json. UTC: o Vercel Cron dispara em UTC.
const JOB_SCHEDULES: Record<string, string> = {
  'close-unconfirmed': '0 3 * * *',
  cleanup: '0 4 * * *',
  'drain-notifications': '*/5 * * * *',
};

export async function runJob<T>(job: string, fn: () => Promise<T>): Promise<{ skipped: false; result: T }> {
  const schedule = JOB_SCHEDULES[job];
  // monitorConfig só na 1ª check-in (in_progress) faz o upsert do monitor no Sentry.
  const monitorConfig = schedule
    ? { schedule: { type: 'crontab' as const, value: schedule }, timezone: 'Etc/UTC', checkinMargin: 5, maxRuntime: 10 }
    : undefined;
  const checkInId = Sentry.captureCheckIn({ monitorSlug: `job-${job}`, status: 'in_progress' }, monitorConfig);

  const run = await db.jobRun.create({
    data: { job, status: 'running', release: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    select: { id: true },
  });

  try {
    const result = await fn();
    await db.jobRun.update({
      where: { id: run.id },
      data: { status: 'ok', finishedAt: new Date(), result: (result as unknown) as object },
    });
    Sentry.captureCheckIn({ checkInId, monitorSlug: `job-${job}`, status: 'ok' });
    log.info({ event: 'finished', job, runId: run.id, status: 'ok' }, 'job finished ok');
    return { skipped: false, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.jobRun.update({
      where: { id: run.id },
      data: { status: 'error', finishedAt: new Date(), error: message },
    }).catch(() => undefined);
    Sentry.captureCheckIn({ checkInId, monitorSlug: `job-${job}`, status: 'error' });
    Sentry.captureException(err, { tags: { component: 'jobrun', job } });
    log.error({ event: 'finished', job, runId: run.id, status: 'error', err }, 'job failed');
    throw err;
  } finally {
    // Sentry em serverless: a função pode CONGELAR logo após retornar, antes do envio
    // assíncrono dos check-ins. Sem flush, o Sentry recebe o `in_progress` mas não o `ok`
    // → marca "Timed Out"/"Missed" (alarme falso). flush garante a entrega antes de retornar.
    await Sentry.flush(2000);
  }
}
