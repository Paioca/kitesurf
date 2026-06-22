// Purga de dados de teste (3.4b). DRY-RUN por padrão: só CONTA, não apaga nada.
// Rodar:  node --env-file=.env prisma/purge-test-data.mjs          (dry-run)
//         node --env-file=.env prisma/purge-test-data.mjs --apply  (apaga, em transação)
//
// ⚠️ O .env aponta pro banco de PROD. Confira os números do dry-run ANTES de --apply.
// Escopo: perfis com telefone do prefixo de seed (+558599100000) e tudo que pendura
// neles, na ordem de FK. Reporta à parte o conteúdo seedado por imagem (picsum/pravatar).
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const PREFIX = '+558599100000'; // marcador da seed-journey (perfis de teste)
const APPLY = process.argv.includes('--apply');

async function main() {
  const testUsers = await db.user.findMany({ where: { phone: { startsWith: PREFIX } }, select: { id: true, phone: true, name: true } });
  const userIds = testUsers.map((u) => u.id);
  const testListings = await db.listing.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const listingIds = testListings.map((l) => l.id);

  // Tudo que precisa sair antes do user (FK sem cascade) — referencia user de teste OU listing de teste.
  const userOrListing = (userField) => ({ OR: [{ [userField]: { in: userIds } }, { listingId: { in: listingIds } }] });

  const convoWhere = { OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }, { listingId: { in: listingIds } }] };
  const counts = {
    review: await db.review.count({ where: { OR: [{ reviewerId: { in: userIds } }, { reviewedId: { in: userIds } }, { deal: { listingId: { in: listingIds } } }] } }),
    message: await db.message.count({ where: { OR: [{ senderId: { in: userIds } }, { conversation: convoWhere }] } }),
    deal: await db.deal.count({ where: { OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }, { listingId: { in: listingIds } }] } }),
    conversation: await db.conversation.count({ where: convoWhere }),
    request: await db.request.count({ where: { OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }, { listingId: { in: listingIds } }] } }),
    favorite: await db.favorite.count({ where: userOrListing('userId') }),
    listing: listingIds.length,
    user: userIds.length,
    otpCode: await db.otpCode.count({ where: { phone: { startsWith: PREFIX } } }),
  };

  console.log(`\n=== DRY-RUN (prefixo ${PREFIX}) ===`);
  for (const u of testUsers) console.log(`  user ${u.phone}  ${u.name ?? ''}`);
  console.log('\n  Linhas que seriam apagadas (ordem de FK):');
  for (const k of ['review', 'message', 'deal', 'conversation', 'request', 'favorite', 'listing', 'user', 'otpCode']) {
    console.log(`    ${k.padEnd(12)} ${counts[k]}`);
  }

  // Visibilidade extra: conteúdo seedado por imagem (seed-cumbuco usa picsum/pravatar),
  // possivelmente FORA do prefixo. NÃO entra na purga automática — só reporta.
  const picsumListings = await db.listing.count({ where: { images: { some: { OR: [{ url: { contains: 'picsum' } }, { url: { contains: 'pravatar' } }] } } } });
  const pravatarUsers = await db.user.count({ where: { avatarUrl: { contains: 'pravatar' } } });
  console.log('\n  Fora do prefixo (NÃO incluído na purga — revisar à mão):');
  console.log(`    listings com imagem picsum/pravatar   ${picsumListings}`);
  console.log(`    users com avatar pravatar             ${pravatarUsers}`);

  const totalReal = await db.user.count();
  const totalListings = await db.listing.count();
  console.log(`\n  Universo total: ${totalReal} users, ${totalListings} listings.`);

  if (!APPLY) {
    console.log('\n(dry-run — nada foi apagado. Rode com --apply pra executar.)\n');
    return;
  }

  console.log('\n>>> APPLY: apagando em transação...');
  await db.$transaction([
    db.review.deleteMany({ where: { OR: [{ reviewerId: { in: userIds } }, { reviewedId: { in: userIds } }, { deal: { listingId: { in: listingIds } } }] } }),
    db.message.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { conversation: convoWhere }] } }),
    db.deal.deleteMany({ where: { OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }, { listingId: { in: listingIds } }] } }),
    db.conversation.deleteMany({ where: convoWhere }),
    db.request.deleteMany({ where: { OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }, { listingId: { in: listingIds } }] } }),
    db.favorite.deleteMany({ where: userOrListing('userId') }),
    db.listing.deleteMany({ where: { id: { in: listingIds } } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
    db.otpCode.deleteMany({ where: { phone: { startsWith: PREFIX } } }),
  ]);
  console.log('>>> feito.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
