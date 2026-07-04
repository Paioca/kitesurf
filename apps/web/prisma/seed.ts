// Seed da taxonomia controlada — docs/reference/taxonomy.md.
// O ativo mais barato e defensável do produto: dropdowns, não texto livre.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONDITION = ['novo', 'seminovo', 'bom', 'usado', 'com_reparos'];
// Condição do kite — focada no estado do tecido (sem "com reparo"):
const KITE_CONDITION = ['novo_lacrado', 'novo_10x', 'semi_otimo', 'semi_desgaste', 'usado_desgaste'];
const BARRA_CONDITION = ['novo', 'seminovo', 'bom', 'usado'];

const CATEGORIES = [
  {
    slug: 'kite',
    namePt: 'Kite',
    nameEn: 'Kite',
    active: true,
    attributeSchema: {
      required: ['size_m2', 'condition'],
      properties: {
        size_m2: { type: 'number', label: 'Tamanho (m²)', min: 3, max: 20, step: 0.1 }, // decimal (8.1, 13.5) — sem enum: busca agrupa por faixa
        condition: { type: 'string', label: 'Condição', enum: KITE_CONDITION },
        microfuros: { type: 'integer', label: 'Micro furos (qtd)' },
        reparos: { type: 'integer', label: 'Reparos (qtd)' },
        bladder: { type: 'string', label: 'Bladder', enum: ['zero', 'microfuro_adesivado'] },
        mangueiras: { type: 'string', label: 'Mangueiras', enum: ['original', 'ja_trocadas'] },
      },
    },
  },
  {
    slug: 'barra',
    namePt: 'Barra',
    nameEn: 'Bar',
    active: true,
    attributeSchema: {
      required: ['line_length_m', 'condition'],
      properties: {
        compatible_brand: { type: 'string', label: 'Marca compatível' },
        line_length_m: { type: 'number', label: 'Comprimento de linha (m)' },
        condition: { type: 'string', label: 'Condição', enum: BARRA_CONDITION },
        lines_state: { type: 'string', label: 'Estado das linhas' },
      },
    },
  },
  {
    slug: 'twin-tip',
    namePt: 'Twin Tip',
    nameEn: 'Twin Tip',
    active: false,
    attributeSchema: {
      required: ['length_cm', 'condition'],
      properties: {
        length_cm: { type: 'number', label: 'Comprimento (cm)' },
        width_cm: { type: 'number', label: 'Largura (cm)' },
        condition: { type: 'string', enum: CONDITION },
        with_fins: { type: 'boolean', label: 'Com quilhas' },
        with_pads: { type: 'boolean', label: 'Com straps/pads' },
      },
    },
  },
  {
    slug: 'surfboard',
    namePt: 'Surfboard (Wave)',
    nameEn: 'Surfboard (Wave)',
    active: false,
    attributeSchema: {
      required: ['length', 'condition'],
      properties: {
        length: { type: 'string', label: 'Comprimento' },
        volume: { type: 'number', label: 'Volume (L)' },
        condition: { type: 'string', enum: CONDITION },
        repairs_count: { type: 'integer', label: 'Nº de reparos' },
      },
    },
  },
  {
    slug: 'foil',
    namePt: 'Foil',
    nameEn: 'Foil',
    active: false,
    attributeSchema: {
      required: ['mast_length', 'condition'],
      properties: {
        mast_length: { type: 'string', label: 'Tamanho do mastro' },
        front_wing_cm2: { type: 'number', label: 'Front wing (cm²)' },
        condition: { type: 'string', enum: CONDITION },
        type: { type: 'string', enum: ['race', 'freeride'] },
      },
    },
  },
  {
    slug: 'trapezio',
    namePt: 'Trapézio',
    nameEn: 'Harness',
    active: false,
    attributeSchema: {
      required: ['harness_size', 'condition'],
      properties: {
        harness_size: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
        type: { type: 'string', enum: ['seat', 'waist'] },
        condition: { type: 'string', enum: CONDITION },
      },
    },
  },
  {
    slug: 'acessorios',
    namePt: 'Acessórios',
    nameEn: 'Accessories',
    active: false,
    attributeSchema: {
      required: ['subtype', 'condition'],
      properties: {
        subtype: { type: 'string', label: 'Tipo (colete, leash, bomba, gancho...)' },
        condition: { type: 'string', enum: CONDITION },
      },
    },
  },
];

// Marca -> modelos. Catálogo de kites (marcas/modelos amarrados à categoria kite).
const BRANDS: Record<string, string[]> = {
  Duotone: [
    'Evo', 'Evo SLS', 'Evo D/LAB', 'Evo D/LAB LTD', 'Evo Concept Blue',
    'Rebel', 'Rebel SLS', 'Rebel D/LAB', 'Rebel SLS Concept Blue',
    'Neo', 'Neo SLS', 'Neo D/LAB',
    'Dice', 'Dice SLS',
    'Juice', 'Juice D/LAB',
    'Mono', 'Vegas', 'Vegas Concept Blue',
  ],
  'North Kiteboarding': [
    'Orbit', 'Orbit Pro', 'Orbit Ultra', 'Reach', 'Carve', 'Pulse', 'Code Zero', 'Code Zero Pro',
  ],
  'North/Duotone (antigo)': [
    'Rebel', 'Dice', 'Neo', 'Evo', 'Vegas', 'Vegas Hadlow', 'Mono', 'Juice',
    'Dyno', 'Fuse', 'Rhino', 'Reno', 'Toro',
  ],
  CORE: [
    'Pace', 'Pace Pro',
    'XR', 'XR X', 'XR Pro', 'XR Pro 2', 'XR3', 'XR4', 'XR5', 'XR6', 'XR7', 'XR8',
    'Nexus', 'Nexus 2', 'Nexus 3', 'Nexus 4',
    'Section', 'Section 2', 'Section 3', 'Section 4', 'Section 5',
    'GTS', 'GTS2', 'GTS3', 'GTS4', 'GTS5', 'GTS6',
    'Xlite', 'Xlite 2',
    'Impact', 'Impact 2',
    'Air', 'Air Pro', 'Xperience',
  ],
  Cabrinha: [
    'Switchblade', 'Moto', 'Moto X', 'Moto X Apex', 'Nitro', 'Drifter',
    'Contra', 'Contra Aether', 'FX', 'FX2', 'Chaos', 'Radar', 'Vector', 'Crossbow', 'Nomad',
  ],
  'F-One': [
    'Bandit', 'Bandit S', 'Bandit Brainchild', 'Trigger', 'Trigger Brainchild',
    'Breeze', 'Breeze V4', 'Bullit', 'One', 'Halo',
  ],
  Naish: [
    'Pivot', 'Pivot LE', 'Boxer', 'Triad', 'Dash', 'Torch', 'Slash',
    'Park', 'Ride', 'Helix', 'Bolt', 'Charger', 'Cult',
  ],
  Ozone: [
    'Catalyst', 'Catalyst V5', 'Enduro', 'Enduro V5', 'Enduro V5 Ultra-X',
    'Edge', 'Edge VT', 'Edge VT Ultra-X', 'Vortex Ultra-X',
    'Reo', 'Reo V7', 'Reo V7 Ultra-X', 'Alpha', 'Alpha V3 Ultra-X',
    'Zephyr', 'Zephyr V8 Ultra-X', 'Hyperlink', 'Hyperlink V4',
    'Mach1', 'Uno', 'Chrono', 'R1',
  ],
  Slingshot: [
    'Code', 'Code V2', 'Code NXT', 'Code NXT V2', 'Machine', 'Machine V3',
    'Ghost', 'Ghost V3', 'Ghost V4', 'SST', 'RPX', 'RPM', 'Rally', 'Rally GT',
    'Turbine', 'UFO', 'Fuel', 'Octane',
  ],
  Airush: [
    'Lithium', 'Lithium Team', 'Ultra', 'Ultra Team', 'Lift', 'Session',
    'Razor', 'Union', 'One', 'Wave', 'Varial X', 'DNA',
  ],
  Reedin: [
    'SuperModel', 'SuperModel HTF', 'HyperModel', 'HyperModel HTF', 'MasterModel',
  ],
  Eleveight: [
    'RS', 'RS+', 'XS', 'FS', 'WS', 'OS', 'PS', 'Commander',
  ],
  Bullman: ['Bravo'],
  Flysurfer: [
    'Soul', 'Soul 2', 'Soul 3', 'Sonic', 'Sonic 2', 'Sonic 3', 'Sonic 4',
    'Sonic Race', 'Sonic Race VMG', 'Boost', 'Boost 2', 'Boost 3',
    'Stoke', 'Peak', 'Peak 3', 'Peak 4', 'Peak 5', 'Speed', 'Speed 5', 'Hybrid', 'Viron',
  ],
  RRD: [
    'Religion', 'Obsession', 'Gold Obsession', 'Passion', 'Vision',
    'Emotion', 'Addiction', 'Hyper Type', 'Type',
  ],
  CrazyFly: ['Sculp', 'Hyper', 'Tango', 'Cruze', 'Max', 'Pure'],
  'Ocean Rodeo': [
    'Roam', 'Roam A-Series', 'Flite', 'Flite A-Series', 'Rise', 'Rise A-Series',
    'Crave', 'Crave HL', 'Prodigy', 'Razor', 'One',
  ],
  Best: [
    'Kahoona', 'TS', 'GP', 'Waroo', 'Nemesis', 'Cabo', 'Taboo', 'Yarga', 'Bularoo', 'Roca',
  ],
  'Liquid Force': [
    'NV', 'Envy', 'Solo', 'Wow', 'P1', 'Hifi', 'Hifi X', 'NRG', 'Havoc', 'Tension', 'Elite',
  ],
  Harlem: ['Thrive', 'Force', 'Go', 'Lead', 'Hadlow Pro', 'Peak'],
};

// Marca -> modelos de BARRA (amarrados à categoria barra). Mesmas marcas do catálogo
// de kites; nomes de modelo não colidem com os de kite (uniqueness é por marca+nome).
const BAR_BRANDS: Record<string, string[]> = {
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
  console.log('Seeding taxonomia...');

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { namePt: c.namePt, nameEn: c.nameEn, attributeSchema: c.attributeSchema, active: c.active },
      create: c,
    });
  }
  console.log(`  ${CATEGORIES.length} categorias`);

  // Marca legada "Core" (criada vazia em seeds antigos) -> "CORE" da lista oficial.
  // Rename direto colide com o unique Brand.name quando as duas coexistem (P2002) e
  // travava o seed inteiro. Fusão idempotente: reaponta FKs (Model + Listing) e remove
  // a legada. Correção completa e reutilizável fora do seed: prisma/merge-brand-core.mjs.
  const coreLegacy = await prisma.brand.findUnique({ where: { name: 'Core' } });
  if (coreLegacy) {
    const coreCanonical = await prisma.brand.findUnique({ where: { name: 'CORE' } });
    if (!coreCanonical) {
      await prisma.brand.update({ where: { id: coreLegacy.id }, data: { name: 'CORE' } });
    } else {
      await prisma.$transaction(async (tx) => {
        for (const m of await tx.model.findMany({ where: { brandId: coreLegacy.id } })) {
          const clash = await tx.model.findUnique({
            where: { brandId_name: { brandId: coreCanonical.id, name: m.name } },
          });
          if (clash) {
            await tx.listing.updateMany({ where: { modelId: m.id }, data: { modelId: clash.id } });
            await tx.listing.updateMany({ where: { barraModelId: m.id }, data: { barraModelId: clash.id } });
            await tx.model.delete({ where: { id: m.id } });
          } else {
            await tx.model.update({ where: { id: m.id }, data: { brandId: coreCanonical.id } });
          }
        }
        await tx.listing.updateMany({ where: { brandId: coreLegacy.id }, data: { brandId: coreCanonical.id } });
        await tx.listing.updateMany({ where: { barraBrandId: coreLegacy.id }, data: { barraBrandId: coreCanonical.id } });
        await tx.brand.delete({ where: { id: coreLegacy.id } });
      });
    }
  }

  const kite = await prisma.category.findUnique({ where: { slug: 'kite' } });
  if (!kite) throw new Error('Categoria "kite" não encontrada — seed de categorias falhou.');
  const barra = await prisma.category.findUnique({ where: { slug: 'barra' } });
  if (!barra) throw new Error('Categoria "barra" não encontrada — seed de categorias falhou.');

  // Insere os modelos de uma categoria sob suas marcas; cria a marca se ainda não existir.
  async function seedModels(map: Record<string, string[]>, categoryId: string) {
    let count = 0;
    for (const [brandName, models] of Object.entries(map)) {
      const brand = await prisma.brand.upsert({
        where: { name: brandName },
        update: {},
        create: { name: brandName },
      });
      for (const m of models) {
        await prisma.model.upsert({
          where: { brandId_name: { brandId: brand.id, name: m } },
          update: { categoryId }, // backfill nos modelos já existentes
          create: { name: m, brandId: brand.id, categoryId },
        });
        count++;
      }
    }
    return count;
  }

  const kiteModels = await seedModels(BRANDS, kite.id);
  const barModels = await seedModels(BAR_BRANDS, barra.id);
  const brandCount = await prisma.brand.count();
  console.log(`  ${brandCount} marcas, ${kiteModels} modelos de kite, ${barModels} modelos de barra`);
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
