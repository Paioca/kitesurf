// Seed de DEMO — popula a jornada completa pra testar oferta → aceite → venda → review.
//   (rodar de dentro de apps/web)  npx ts-node prisma/seed-journey.ts
// Idempotente: apaga e recria os perfis de teste (telefone com prefixo +558599100000).
// Imagens são URLs externas (picsum) — sem upload no Storage; renderizam nos cards.
// Login dos perfis: mock OTP (o código volta na resposta e auto-preenche). Telefones no fim.
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient, ListingStatus, RequestType, RequestStatus, DealStatus, Prisma } from '@prisma/client';

const db = new PrismaClient();

async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const PREFIX = '+558599100000'; // marcador dos perfis de teste
const img = (seed: string) => ({ url: `https://picsum.photos/seed/${seed}/1600/1200`, thumbUrl: `https://picsum.photos/seed/${seed}/400/300` });
const reais = (n: number) => n * 100; // reais → centavos

async function brand(name: string) {
  return db.brand.upsert({ where: { name }, update: {}, create: { name } });
}

async function main() {
  await loadEnv();

  // ---- categorias (já semeadas pelo seed.ts da taxonomia) ----
  const kite = await db.category.findUnique({ where: { slug: 'kite' } });
  const barra = await db.category.findUnique({ where: { slug: 'barra' } });
  if (!kite || !barra) throw new Error('Rode antes o seed da taxonomia (prisma/seed.ts) — faltam categorias kite/barra.');

  // ---- limpeza dos perfis de teste anteriores ----
  const old = await db.user.findMany({ where: { phone: { startsWith: PREFIX } }, select: { id: true } });
  const ids = old.map((u) => u.id);
  if (ids.length) {
    await db.review.deleteMany({ where: { OR: [{ reviewerId: { in: ids } }, { reviewedId: { in: ids } }] } });
    await db.deal.deleteMany({ where: { OR: [{ sellerId: { in: ids } }, { buyerId: { in: ids } }] } });
    await db.request.deleteMany({ where: { OR: [{ sellerId: { in: ids } }, { buyerId: { in: ids } }] } });
    await db.favorite.deleteMany({ where: { userId: { in: ids } } });
    await db.listing.deleteMany({ where: { userId: { in: ids } } }); // cascata: imagens
    await db.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`limpou ${ids.length} perfis de teste antigos`);
  }

  // ---- perfis ----
  const mkUser = (n: number, name: string, extra: Partial<Prisma.UserCreateInput> = {}) =>
    db.user.create({ data: { name, phone: `${PREFIX}${n}`, phoneVerified: true, avatarUrl: `https://i.pravatar.cc/200?u=${PREFIX}${n}`, ...extra } });

  const bruno = await mkUser(1, 'Bruno Sales', { instagramHandle: 'bruno.kite' });
  const marina = await mkUser(2, 'Marina Costa');
  const carlos = await mkUser(3, 'Carlos Dunas', { instagramHandle: 'carlos.dunas', role: 'business' });
  const ana = await mkUser(4, 'Ana Ribeiro');
  const pedro = await mkUser(5, 'Pedro Lima');

  // ---- marcas ----
  const duotone = await brand('Duotone');
  const core = await brand('CORE'); // canônica (não recriar a legada "Core")
  const north = await brand('North');
  const cabrinha = await brand('Cabrinha');
  const fone = await brand('F-One');

  // ---- anúncios ----
  const mkListing = (data: Prisma.ListingCreateManyInput) => data;

  const L1 = await db.listing.create({
    data: {
      userId: bruno.id, categoryId: kite.id, brandId: duotone.id, year: 2022,
      title: 'Kite Duotone Evo 12m 2022', price: reais(4500),
      attributes: { size_m2: 12, condition: 'seminovo' }, city: 'Fortaleza', spot: 'Cumbuco',
      shippable: true, status: ListingStatus.active,
      images: { create: [{ ...img('duotone-evo'), position: 0 }] },
    },
  });

  const L2 = await db.listing.create({
    data: {
      userId: bruno.id, categoryId: kite.id, brandId: core.id, year: 2021,
      title: 'Kit Core Nexus 9m + Barra Sensor', price: reais(6200),
      hasBarra: true, kitePrice: reais(4800), barraPrice: reais(1800),
      attributes: { size_m2: 9, condition: 'bom' },
      barraAttributes: { line_length_m: 24, condition: 'bom' },
      city: 'Fortaleza', spot: 'Cumbuco', status: ListingStatus.active,
      images: { create: [{ ...img('core-kite'), component: 'kite', position: 0 }, { ...img('core-barra'), component: 'barra', position: 1 }] },
    },
  });

  const L3 = await db.listing.create({
    data: {
      userId: carlos.id, categoryId: barra.id, brandId: north.id,
      title: 'Barra North Navigator', price: reais(1500),
      attributes: { line_length_m: 22, condition: 'seminovo' }, city: 'Fortaleza', spot: 'Cumbuco',
      shippable: true, status: ListingStatus.active,
      images: { create: [{ ...img('north-bar'), position: 0 }] },
    },
  });

  const L4 = await db.listing.create({
    data: {
      userId: carlos.id, categoryId: kite.id, brandId: cabrinha.id, year: 2020,
      title: 'Kite Cabrinha Switchblade 9m', price: reais(3200),
      attributes: { size_m2: 9, condition: 'usado' }, city: 'Fortaleza', spot: 'Cumbuco',
      status: ListingStatus.sold, soldToUserId: pedro.id, lastConfirmedAt: new Date(),
      images: { create: [{ ...img('cabrinha-sb'), position: 0 }] },
    },
  });

  const L5 = await db.listing.create({
    data: {
      userId: bruno.id, categoryId: kite.id, brandId: fone.id, year: 2021,
      title: 'Kite F-One Bandit 7m', price: reais(2800),
      attributes: { size_m2: 7, condition: 'bom' }, city: 'Fortaleza', spot: 'Cumbuco',
      status: ListingStatus.paused,
      images: { create: [{ ...img('fone-bandit'), position: 0 }] },
    },
  });

  // ---- pedidos (ofertas / visitas) ----
  // R1: Marina faz oferta no kite do Bruno (PENDENTE → Bruno vê "novo")
  await db.request.create({ data: { listingId: L1.id, buyerId: marina.id, sellerId: bruno.id, type: RequestType.offer, amount: reais(4200), status: RequestStatus.pending } });
  // R2: Marina pede visita no kit do Bruno (PENDENTE)
  await db.request.create({ data: { listingId: L2.id, buyerId: marina.id, sellerId: bruno.id, type: RequestType.visit, status: RequestStatus.pending } });
  // R3: Ana faz oferta na barra do Carlos (ACEITA → WhatsApp liberado pra Ana)
  await db.request.create({ data: { listingId: L3.id, buyerId: ana.id, sellerId: carlos.id, type: RequestType.offer, amount: reais(1400), status: RequestStatus.accepted } });
  // R4: Pedro fez oferta no Cabrinha do Carlos (ACEITA → virou venda concluída)
  await db.request.create({ data: { listingId: L4.id, buyerId: pedro.id, sellerId: carlos.id, type: RequestType.offer, amount: reais(3200), status: RequestStatus.accepted } });

  // ---- deals (checagem cruzada) ----
  // D1: Carlos marcou a barra como vendida pra Ana → aguardando Ana confirmar (seller_confirmed)
  await db.deal.create({ data: { listingId: L3.id, sellerId: carlos.id, buyerId: ana.id, status: DealStatus.seller_confirmed, sellerConfirmedAt: new Date() } });
  // D2: venda do Cabrinha concluída (Carlos↔Pedro) + avaliações dos dois lados
  const d2 = await db.deal.create({ data: { listingId: L4.id, sellerId: carlos.id, buyerId: pedro.id, status: DealStatus.completed, sellerConfirmedAt: new Date(), buyerConfirmedAt: new Date() } });
  await db.review.create({ data: { dealId: d2.id, reviewerId: pedro.id, reviewedId: carlos.id, rating: 5, comment: 'Equipamento idêntico ao anúncio, vendedor super tranquilo. Recomendo!' } });
  await db.review.create({ data: { dealId: d2.id, reviewerId: carlos.id, reviewedId: pedro.id, rating: 5, comment: 'Comprador pontual e direto. Negócio fechado sem dor de cabeça.' } });

  // ---- favoritos (pra /favoritos não ficar vazio) ----
  await db.favorite.createMany({ data: [{ userId: marina.id, listingId: L3.id }, { userId: marina.id, listingId: L1.id }] });

  console.log('\n✓ Jornada semeada. Logue (mock OTP auto-preenche) com:');
  console.log(`  Bruno (vendedor, ofertas/visitas recebidas + anúncios): ${PREFIX}1`);
  console.log(`  Marina (compradora, ofertas pendentes enviadas):        ${PREFIX}2`);
  console.log(`  Carlos (vendedor c/ reputação ★5 + venda a confirmar):  ${PREFIX}3`);
  console.log(`  Ana (compradora, oferta aceita → WhatsApp + confirmar): ${PREFIX}4`);
  console.log(`  Pedro (comprador, compra concluída + avaliação):        ${PREFIX}5`);
  console.log(`  Anúncios: ${[L1, L2, L3, L4, L5].map((l) => l.id.slice(0, 8)).join(', ')}`);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
