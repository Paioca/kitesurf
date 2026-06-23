// Diagnóstico read-only do estado das migrations do Sprint 0/1.
// Confere se as colunas/tabelas que o código novo espera existem no banco e como o
// _prisma_migrations registrou cada uma. Decide o que fazer baseado no estado real.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const MIGS = [
  '20260622000000_moderation_actions',
  '20260623000000_negociacao_v2',
  '20260623120000_ratehit_atomic_bucket',
  '20260623130000_audit_event_job_run',
];

async function tableExists(name) {
  const r = await db.$queryRawUnsafe(`SELECT to_regclass($1)::text AS reg`, `"${name}"`);
  return !!r?.[0]?.reg;
}
async function columnExists(table, col) {
  const r = await db.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    table, col
  );
  return r.length > 0;
}
async function indexExists(name) {
  const r = await db.$queryRawUnsafe(
    `SELECT 1 FROM pg_indexes WHERE indexname=$1`, name
  );
  return r.length > 0;
}

async function main() {
  console.log('=== _prisma_migrations rows ===');
  for (const m of MIGS) {
    const row = await db.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
         FROM _prisma_migrations WHERE migration_name = $1`, m
    );
    if (!row[0]) { console.log(`${m}: (sem registro)`); continue; }
    const r = row[0];
    const state = r.rolled_back_at ? 'ROLLED_BACK' : r.finished_at ? 'APPLIED' : 'FAILED_OR_RUNNING';
    console.log(`${m}: ${state}  steps=${r.applied_steps_count}  started=${r.started_at?.toISOString?.() ?? r.started_at}  finished=${r.finished_at?.toISOString?.() ?? r.finished_at}`);
  }

  console.log('\n=== actual DB shape ===');
  console.log('ModerationAction table  :', await tableExists('ModerationAction'));
  console.log('RateHit.bucketStart col :', await columnExists('RateHit', 'bucketStart'));
  console.log('RateHit.count col       :', await columnExists('RateHit', 'count'));
  console.log('RateHit unique index    :', await indexExists('RateHit_key_bucketStart_key'));
  console.log('AuditEvent table        :', await tableExists('AuditEvent'));
  console.log('JobRun table            :', await tableExists('JobRun'));

  console.log('\nReporta este output que eu te digo o próximo passo.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
