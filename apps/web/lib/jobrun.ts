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
// Lock contra execução concorrente: usa pg_try_advisory_lock(hashtext(job)). Se outra
// execução do MESMO job estiver em curso, ESTA aborta com status=skipped (não esperamos
// na fila — o cron é diário, perder uma janela é melhor que pendurar).
// Schedules dos crons (espelham apps/web/vercel.json). Necessários pro Sentry CRIAR/casar o
// monitor via upsert na 1ª check-in — sem o monitorConfig o Sentry responde "monitor not found"
// e REJEITA o check-in (era o caso: nenhum monitor job-* existia e o alerta de cron-parado não
// funcionava). Mantenha em sincronia com vercel.json. UTC: o Vercel Cron dispara em UTC.
const JOB_SCHEDULES: Record<string, string> = {
  'close-unconfirmed': '0 3 * * *',
  cleanup: '0 4 * * *',
  'drain-notifications': '*/5 * * * *',
};

export async function runJob<T>(job: string, fn: () => Promise<T>): Promise<{ skipped: true } | { skipped: false; result: T }> {
  const schedule = JOB_SCHEDULES[job];
  // monitorConfig só na 1ª check-in (in_progress) faz o upsert do monitor no Sentry.
  const monitorConfig = schedule
    ? { schedule: { type: 'crontab' as const, value: schedule }, timezone: 'Etc/UTC', checkinMargin: 5, maxRuntime: 10 }
    : undefined;
  const checkInId = Sentry.captureCheckIn({ monitorSlug: `job-${job}`, status: 'in_progress' }, monitorConfig);

  // Tenta um advisory lock por job. Mesmo nome de job → mesmo lock id (hashtext).
  // pg_try_advisory_lock devolve true se pegou, false se já estava com outro processo.
  const lockRow = await db.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${job})) AS locked
  `;
  const locked = lockRow[0]?.locked === true;
  if (!locked) {
    Sentry.captureCheckIn({ checkInId, monitorSlug: `job-${job}`, status: 'ok' });
    log.warn({ event: 'skipped', job, reason: 'already_running' }, 'job skipped — another instance is running');
    return { skipped: true };
  }

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
    // Solta o advisory lock SEMPRE (mesmo em erro). Em serverless isso libera pro
    // próximo schedule sem depender do reciclo da conexão.
    await db.$executeRaw`SELECT pg_advisory_unlock(hashtext(${job}))`.catch(() => undefined);
  }
}
