// Diagnóstico read-only do estado da migration moderation_actions em prod.
// Responde 3 perguntas: a tabela ModerationAction existe? o enum existe? como o
// _prisma_migrations registrou a tentativa? Essas 3 respostas decidem se a gente
// roda `migrate resolve --applied` (estado já está aplicado, só não foi marcado) ou
// `--rolled-back` (nada foi aplicado, pode re-rodar) ou cleanup manual (parcial).
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const MIG = '20260622000000_moderation_actions';

async function main() {
  // Cast pra text: regclass/regtype são tipos nativos do PG e o Prisma não desserializa.
  const tableExists = await db.$queryRawUnsafe(
    `SELECT to_regclass('"ModerationAction"')::text AS reg`
  );
  const enumExists = await db.$queryRawUnsafe(
    `SELECT to_regtype('"ModerationActionType"')::text AS reg`
  );
  const rowsInTable = tableExists?.[0]?.reg
    ? await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "ModerationAction"`)
    : null;
  const prismaRow = await db.$queryRawUnsafe(
    `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
       FROM _prisma_migrations
      WHERE migration_name = $1`,
    MIG
  );

  console.log('=== diagnostic: moderation_actions migration ===');
  console.log('ModerationAction table exists ?', tableExists?.[0]?.reg);
  console.log('ModerationActionType enum exists?', enumExists?.[0]?.reg);
  console.log('rows in ModerationAction       ?', rowsInTable?.[0]?.n ?? '(table absent)');
  console.log('_prisma_migrations row         :', JSON.stringify(prismaRow, null, 2));

  // Sugestão automática
  const t = !!tableExists?.[0]?.reg;
  const e = !!enumExists?.[0]?.reg;
  console.log('\n=== suggested next step ===');
  if (t && e) {
    console.log('Estado: tabela+enum existem. Provável: SQL passou, _prisma_migrations não marcou.');
    console.log('Fix: npx prisma migrate resolve --applied 20260622000000_moderation_actions');
  } else if (!t && !e) {
    console.log('Estado: nada foi criado. Migration travou no comando 1.');
    console.log('Fix: npx prisma migrate resolve --rolled-back 20260622000000_moderation_actions');
    console.log('     (depois rode migrate deploy novamente — ela vai aplicar do zero)');
  } else {
    console.log('Estado: PARCIAL — tabela?', t, 'enum?', e);
    console.log('Fix: cleanup manual (DROP TABLE / DROP TYPE do que existir) + migrate resolve --rolled-back.');
    console.log('     Me passa este output que eu monto o SQL exato.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
