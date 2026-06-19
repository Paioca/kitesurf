import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { searchListings } from '../../../lib/queries';
import { LISTINGS_TAG } from '../../../lib/browse';
import { requireUser, UnauthorizedError } from '../../../lib/session';
import { validateAttributes } from '../../../lib/attributes';
import { rateLimit, tooMany } from '../../../lib/ratelimit';
import { Prisma } from '@prisma/client';

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
  year: z.number().int().min(1990).max(2100).optional(),
  attributes: z.record(z.any()),
  title: z.string().min(4).max(120),
  description: z.string().max(4000).optional(),
  price: z.number().int().min(100), // conjunto (kit) ou peça única
  city: z.string().min(1),
  spot: z.string().optional(),
  shippable: z.boolean(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string().optional(), component: z.enum(['kite', 'barra']).optional() })).min(3).max(40),
  // kit (kite + barra)
  hasBarra: z.boolean().optional(),
  kitePrice: z.number().int().min(100).nullable().optional(), // kite avulso
  barraPrice: z.number().int().min(100).nullable().optional(), // barra avulsa
  barraAttributes: z.record(z.any()).optional(),
});

// POST /api/listings — criar anúncio (exige login)
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!(await rateLimit(`listing:${user.id}`, 20, 3600))) return tooMany();
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;

    const category = await db.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) return NextResponse.json({ message: 'Categoria inválida.' }, { status: 400 });

    const attributes = validateAttributes(category.attributeSchema as any, dto.attributes);

    // Kit: categoria primária precisa ser kite; valida infos da barra; exige
    // ao menos 1 foto de cada peça (a barra precisa de foto própria pra busca de barra).
    let barraAttributes: Prisma.InputJsonValue | undefined;
    const hasBarra = dto.hasBarra === true;
    if (hasBarra) {
      if (category.slug !== 'kite') return NextResponse.json({ message: 'Kit precisa ter o kite como peça principal.' }, { status: 400 });
      const barraCat = await db.category.findUnique({ where: { slug: 'barra' } });
      if (!barraCat) return NextResponse.json({ message: 'Categoria de barra ausente.' }, { status: 400 });
      barraAttributes = validateAttributes(barraCat.attributeSchema as any, dto.barraAttributes ?? {}) as Prisma.InputJsonValue;
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
        year: dto.year ?? null,
        attributes: attributes as Prisma.InputJsonValue,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price,
        city: dto.city,
        spot: dto.spot ?? null,
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
    revalidateTag(LISTINGS_TAG); // anúncio novo aparece na busca na hora
    return NextResponse.json(listing, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}
