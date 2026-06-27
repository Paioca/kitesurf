import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '../../../lib/http';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { searchListings } from '../../../lib/queries';
import { SPOTS } from '../../../lib/filters';
import { requireUser, UnauthorizedError } from '../../../lib/session';
import { validateAttributes } from '../../../lib/attributes';
import { isOfficialImageUrl } from '../../../lib/storage';
import { rateLimit, tooMany } from '../../../lib/ratelimit';
import { ACTIVE_LISTING_LIMIT, activeListingWhere, MIN_LISTING_PRICE_CENTS } from '../../../lib/listing-status';
import { Prisma } from '@prisma/client';

const PRICE_MIN_MSG = 'O preço mínimo de um anúncio é R$100.';

export const runtime = 'nodejs';

// GET /api/listings — busca pública (sem login)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => (sp.get(k) != null ? Number(sp.get(k)) : undefined);
  const result = await searchListings({
    category: sp.get('category') ?? undefined,
    city: sp.get('city') ?? undefined,
    brandId: sp.get('brandId') ?? undefined,
    q: sp.get('q') ?? undefined,
    sizeMin: num('sizeMin'),
    sizeMax: num('sizeMax'),
    priceMin: num('priceMin'),
    priceMax: num('priceMax'),
    shippable: sp.get('shippable') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    page: num('page'),
  });
  return NextResponse.json(result);
}

const createSchema = z.object({
  categoryId: z.string().uuid(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  barraBrandId: z.string().uuid().optional(),
  barraModelId: z.string().uuid().optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  barraYear: z.number().int().min(1990).max(2100).optional(),
  attributes: z.record(z.any()),
  title: z.string().min(4).max(120),
  description: z.string().max(4000).optional(),
  price: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: PRICE_MIN_MSG }), // conjunto (kit) ou peça única
  city: z.string().refine((c) => SPOTS.includes(c), { message: 'Spot inválido. Escolha um da lista oficial.' }),
  spot: z.string().optional(),
  pickup: z.boolean().optional(),
  shippable: z.boolean(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string().optional(), component: z.enum(['kite', 'barra']).optional() })).min(3).max(40),
  // kit (kite + barra)
  hasBarra: z.boolean().optional(),
  kitePrice: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: PRICE_MIN_MSG }).nullable().optional(), // kite avulso
  barraPrice: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: PRICE_MIN_MSG }).nullable().optional(), // barra avulsa
  barraAttributes: z.record(z.any()).optional(),
});

function conditionOnlySchema(schema: any): any {
  const condition = schema?.properties?.condition;
  return { required: ['condition'], properties: condition ? { condition } : {} };
}

async function validateCatalogPair(args: {
  brandId?: string;
  modelId?: string;
  categoryId: string;
  label: string;
  requireBoth?: boolean;
}) {
  const { brandId, modelId, categoryId, label, requireBoth } = args;
  if (requireBoth && (!brandId || !modelId)) return `${label}: informe marca e modelo.`;
  if (modelId && !brandId) return `${label}: modelo informado sem marca.`;
  if (brandId && !(await db.brand.findUnique({ where: { id: brandId } }))) return `${label}: marca inválida.`;
  if (modelId) {
    const model = await db.model.findUnique({ where: { id: modelId } });
    if (!model || model.brandId !== brandId) return `${label}: modelo inválido para a marca.`;
    if (model.categoryId && model.categoryId !== categoryId) return `${label}: modelo não pertence a esta categoria.`;
  }
  return null;
}

// POST /api/listings — criar anúncio (exige login)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!(await rateLimit(`listing:${user.id}`, 20, 3600))) return tooMany();
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;

    // Teto anti-spam: máximo de anúncios ATIVOS por usuário (só status 'active').
    // Rate-limit (20/h) já limita a corrida do mesmo usuário; o count fecha o resto.
    if ((await db.listing.count({ where: activeListingWhere(user.id) })) >= ACTIVE_LISTING_LIMIT) {
      return NextResponse.json({ message: `Você atingiu o limite de ${ACTIVE_LISTING_LIMIT} anúncios ativos. Pause, marque como vendido ou exclua um para publicar outro.` }, { status: 409 });
    }

    // Imagens só do nosso storage (cliente reenvia as URLs do upload — não confiar).
    const badImage = dto.images.some((i) => !isOfficialImageUrl(i.url) || (i.thumbUrl != null && !isOfficialImageUrl(i.thumbUrl)));
    if (badImage) return NextResponse.json({ message: 'Imagem inválida.' }, { status: 400 });

    const category = await db.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) return NextResponse.json({ message: 'Categoria inválida.' }, { status: 400 });
    if (!category.active) return NextResponse.json({ message: 'Categoria indisponível.' }, { status: 400 });

    // Marca/modelo: existir, casar entre si e com a categoria da peça.
    const mainCatalogError = await validateCatalogPair({ brandId: dto.brandId, modelId: dto.modelId, categoryId: dto.categoryId, label: 'Equipamento' });
    if (mainCatalogError) return NextResponse.json({ message: mainCatalogError }, { status: 400 });
    if ((category.slug === 'kite' || category.slug === 'barra') && !dto.year) {
      return NextResponse.json({ message: 'Informe o ano do equipamento.' }, { status: 400 });
    }

    const attributes = validateAttributes(category.slug === 'barra' ? conditionOnlySchema(category.attributeSchema) : category.attributeSchema as any, dto.attributes, { requireAll: true });

    // Kit: categoria primária precisa ser kite; valida infos da barra; exige
    // ao menos 1 foto de cada peça (a barra precisa de foto própria pra busca de barra).
    let barraAttributes: Prisma.InputJsonValue | undefined;
    const hasBarra = dto.hasBarra === true;
    if (hasBarra) {
      if (category.slug !== 'kite') return NextResponse.json({ message: 'Kit precisa ter o kite como peça principal.' }, { status: 400 });
      const barraCat = await db.category.findUnique({ where: { slug: 'barra' } });
      if (!barraCat) return NextResponse.json({ message: 'Categoria de barra ausente.' }, { status: 400 });
      const barraCatalogError = await validateCatalogPair({ brandId: dto.barraBrandId, modelId: dto.barraModelId, categoryId: barraCat.id, label: 'Barra', requireBoth: true });
      if (barraCatalogError) return NextResponse.json({ message: barraCatalogError }, { status: 400 });
      if (!dto.barraYear) return NextResponse.json({ message: 'Informe o ano da barra.' }, { status: 400 });
      barraAttributes = validateAttributes(conditionOnlySchema(barraCat.attributeSchema), dto.barraAttributes ?? {}, { requireAll: true }) as Prisma.InputJsonValue;
      const hasKitePhoto = dto.images.some((i) => i.component === 'kite');
      const hasBarraPhoto = dto.images.some((i) => i.component === 'barra');
      if (!hasKitePhoto || !hasBarraPhoto) return NextResponse.json({ message: 'Envie pelo menos uma foto do kite e uma da barra.' }, { status: 400 });
    }

    const listing = await db.listing.create({
      data: {
        userId: user.id,
        categoryId: dto.categoryId,
        brandId: dto.brandId ?? null,
        modelId: dto.modelId ?? null,
        barraBrandId: hasBarra ? dto.barraBrandId ?? null : null,
        barraModelId: hasBarra ? dto.barraModelId ?? null : null,
        year: dto.year ?? null,
        barraYear: hasBarra ? dto.barraYear ?? null : null,
        attributes: attributes as Prisma.InputJsonValue,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price,
        city: dto.city,
        spot: dto.spot ?? null,
        pickup: dto.pickup ?? true,
        shippable: dto.shippable,
        status: 'active',
        lastConfirmedAt: new Date(),
        hasBarra,
        kitePrice: hasBarra ? dto.kitePrice ?? null : null,
        barraPrice: hasBarra ? dto.barraPrice ?? null : null,
        barraAttributes: barraAttributes ?? Prisma.JsonNull,
        images: { create: dto.images.map((img, i) => ({ url: img.url, thumbUrl: img.thumbUrl ?? null, component: img.component ?? null, position: i })) },
      },
      include: { images: true },
    });
    return NextResponse.json(listing, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
