// Restauração pontual do catálogo de BARRAS. Idempotente (upsert): pode rodar quantas
// vezes quiser sem duplicar.
//
// Por que separado do seed.ts: o seed.ts tem um passo legado (renomear a marca
// 'Core' -> 'CORE') que ABORTA com P2002 quando as duas já coexistem no banco — o que
// bloqueia o seed das barras. Este script pula essa mina e só faz upsert do catálogo de
// barras na categoria 'barra'. NÃO toca em usuários/anúncios nem na marca 'Core' legada.
//
// Uso (com DATABASE_URL/DIRECT_URL apontando pro banco-alvo):
//   node prisma/seed-bar-catalog.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Marca -> modelos de barra. Espelha o BAR_BRANDS de prisma/seed.ts (mesma fonte).
const BAR_BRANDS = {
  Duotone: ['Click Bar', 'Trust Bar', 'Trust Bar Quad Control', 'Wakestyle Bar'],
  'North Kiteboarding': ['Navigator', 'Navigator Pro'],
  'North/Duotone (antigo)': ['Click Bar', 'Trust Bar', 'Trust Bar Quad Control', '5th Element Bar', 'Wakestyle Bar'],
  CORE: [
    'Sensor', 'Sensor Pro', 'Sensor 2', 'Sensor 2+', 'Sensor 2S', 'Sensor 2S Pro',
    'Sensor 3', 'Sensor 3 Pro', 'Sensor 3S', 'Sensor 3S Pro',
    'Sensor 4', 'Sensor 4 Pro', 'Sensor 4 Compact', 'Sensor 4S', 'Sensor 4S Pro',
  ],
  Cabrinha: [
    'Cabrinha Operating System', 'COS', 'Overdrive Modular', 'Overdrive 1X',
    'Quickloop Overdrive', 'Quickloop Trimlite', 'Trimlite', 'Recoil', 'IDS',
  ],
  'F-One': ['LINX Bar', 'LINX Bar SK99', 'ATOM', 'Monolith Bar'],
  Naish: ['Torque', 'Torque 2', 'Torque ATB', 'ATB', 'Universal Control System', 'Fusion Control System'],
  Ozone: [
    'Contact Water Control System', 'Contact V4', 'Contact V5',
    'Foil Contact Water Control System', 'Race Control Bar', 'Click-In Loop Control System',
  ],
  Slingshot: [
    'Sentry', 'Sentry V2', 'Sentry V3', 'Sentry Pro',
    'Compstick', 'Compstick Guardian', 'Compstick Sentinel', 'Guardian', 'Sentinel',
  ],
  Airush: ['Smart Bar', 'Smart Bar V3', 'Smart Bar V4', 'Core Bar', 'Access Bar', 'AP Bar', 'Cleat Bar'],
  Reedin: ['DreamStick', 'DreamStick X', 'DreamStick V2', 'DreamStick V3'],
  Eleveight: ['CS Bar', 'CS Vary Bar', 'CS Auto Bar', 'CS Auto Bar V2'],
  Bullman: ['Bullman Bar'],
  Flysurfer: [
    'CONNECT Control Bar', 'FORCE Control Bar', 'INFINITY Control Bar',
    'INFINITY 3.0 Control Bar', 'INFINITY XX Control Bar', 'SYNC Carbon Bar', 'SYNC Carbon Free',
  ],
  RRD: [
    'Global Bar', 'Global Bar V8', 'Global Bar Y25', 'Global Bar Y26',
    'Global Bar Y27', 'Global Bar Y28', 'Global Bar Y29',
  ],
  CrazyFly: ['Sick Bar', 'Sick Bar 2020', 'Sick Bar 2021', 'Sick Bar 2022', 'Sick Bar 2023', 'Sick Bar 2024'],
  'Ocean Rodeo': ['Pilot Bar', 'Pilot Bar 2.0', 'Shift Bar', 'Freeride Bar'],
  Best: ['RP Bar', 'Redline Performance Bar', 'GP Bar', 'TS Bar', 'Best Bar'],
  'Liquid Force': ['Mission Control Bar', 'CPR Control Bar', 'Response Control Bar', 'Liquid Force Bar'],
  Harlem: ['Force Control Bar', 'Lead Bar', 'Harlem Bar'],
};

async function main() {
  const barra = await prisma.category.findUnique({ where: { slug: 'barra' } });
  if (!barra) throw new Error('Categoria "barra" não encontrada — rode o seed de categorias antes.');

  let brands = 0;
  let models = 0;
  for (const [brandName, list] of Object.entries(BAR_BRANDS)) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
    brands++;
    for (const m of list) {
      await prisma.model.upsert({
        where: { brandId_name: { brandId: brand.id, name: m } },
        update: { categoryId: barra.id }, // backfill da categoria em modelos já existentes
        create: { name: m, brandId: brand.id, categoryId: barra.id },
      });
      models++;
    }
  }
  console.log(`Catálogo de barras: ${brands} marcas, ${models} modelos (upsert idempotente).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
