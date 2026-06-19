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
  price: z.number().int().min(100),
  city: z.string().min(1),
  spot: z.string().optional(),
  shippable: z.boolean(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string().optional() })).min(3).max(20),
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
        images: { create: dto.images.map((img, i) => ({ url: img.url, thumbUrl: img.thumbUrl ?? null, position: i })) },
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
