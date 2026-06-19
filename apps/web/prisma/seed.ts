// Seed da taxonomia controlada — docs/reference/taxonomy.md.
// O ativo mais barato e defensável do produto: dropdowns, não texto livre.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONDITION = ['novo', 'seminovo', 'bom', 'usado', 'com_reparos'];

const CATEGORIES = [
  {
    slug: 'kite',
    namePt: 'Kite',
    nameEn: 'Kite',
    active: true,
    attributeSchema: {
      required: ['size_m2', 'condition'],
      properties: {
        size_m2: { type: 'number', label: 'Tamanho (m²)' },
        condition: { type: 'string', enum: CONDITION },
        repairs_count: { type: 'integer', label: 'Nº de reparos' },
        usage_time: { type: 'string', label: 'Tempo de uso estimado' },
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
        condition: { type: 'string', enum: CONDITION },
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

// Marca -> modelos (exemplos da doc; expandir na ingestão).
const BRANDS: Record<string, string[]> = {
  Duotone: ['Rebel', 'Evo', 'Neo', 'Dice', 'Juice'],
  North: ['Orbit', 'Reach', 'Carve'],
  'F-One': ['Bandit', 'Breeze'],
  Cabrinha: ['Switchblade', 'Moto', 'Drifter'],
  Ozone: ['Enduro', 'Edge', 'Reo'],
  Core: [],
  Naish: [],
  Slingshot: [],
  Airush: [],
  Eleveight: [],
  Mystic: [],
  ION: [],
  Reedin: [],
  Flysurfer: [],
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

  let modelCount = 0;
  for (const [brandName, models] of Object.entries(BRANDS)) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
    for (const m of models) {
      await prisma.model.upsert({
        where: { brandId_name: { brandId: brand.id, name: m } },
        update: {},
        create: { name: m, brandId: brand.id },
      });
      modelCount++;
    }
  }
  console.log(`  ${Object.keys(BRANDS).length} marcas, ${modelCount} modelos`);
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
