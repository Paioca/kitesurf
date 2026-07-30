// Mede o impacto de ligar VERIFICATION_GATE_EMAIL=on: quantos usuários ATIVOS
// (com anúncio ativo ou request nos últimos 30 dias) seriam bloqueados por não
// ter e-mail verificado. Read-only. Rodar contra STAGING ou prod (leitura).
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      status: 'active',
      OR: [
        { listings: { some: { status: 'active', deletedAt: null } } },
        { sentRequests: { some: { createdAt: { gte: since } } } },
        { receivedRequests: { some: { createdAt: { gte: since } } } },
      ],
    },
    select: { id: true, email: true, emailVerified: true, phone: true, phoneVerified: true },
  });

  const noEmail = users.filter((u) => !u.email);
  const emailUnverified = users.filter((u) => u.email && !u.emailVerified);
  const emailOk = users.filter((u) => u.email && u.emailVerified);
  const noPhone = users.filter((u) => !u.phone || !u.phoneVerified);

  console.log('=== Impacto do gate de verificação (usuários ativos nos últimos 30d ou com anúncio ativo) ===');
  console.log(`Total considerados:        ${users.length}`);
  console.log(`Sem e-mail na conta:       ${noEmail.length}  ← bloqueados se gate e-mail on`);
  console.log(`E-mail não verificado:     ${emailUnverified.length}  ← bloqueados se gate e-mail on`);
  console.log(`E-mail verificado:         ${emailOk.length}  ← passam`);
  console.log(`Sem telefone verificado:   ${noPhone.length}  ← bloqueados pelo gate de phone (sempre on)`);
}

main().finally(() => db.$disconnect());
