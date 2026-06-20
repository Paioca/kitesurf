import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/db';
import { getListing } from '../../../../lib/queries';
import { LISTINGS_TAG } from '../../../../lib/browse';
import { requireUser, UnauthorizedError } from '../../../../lib/session';
import { validateAttributes } from '../../../../lib/attributes';
import { isOfficialImageUrl } from '../../../../lib/storage';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  if (!listing) return NextResponse.json({ message: 'Anúncio não encontrado.' }, { status: 404 });
  return NextResponse.json(listing);
}

// Campos editáveis (todos opcionais) + status (pausar/reativar/arquivar).
// Categoria/tipo (kite vs kit) NÃO mudam por edição.
const patchSchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  attributes: z.record(z.any()).optional(),
  title: z.string().min(4).max(120).optional(),
  description: z.string().max(4000).nullable().optional(),
  price: z.number().int().min(100).optional(),
  city: z.string().min(1).optional(),
  spot: z.string().nullable().optional(),
  shippable: z.boolean().optional(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string().optional(), component: z.enum(['kite', 'barra']).optional() })).min(3).max(40).optional(),
  kitePrice: z.number().int().min(100).nullable().optional(),
  barraPrice: z.number().int().min(100).nullable().optional(),
  barraAttributes: z.record(z.any()).optional(),
});

async function ownedListing(id: string, userId: string) {
  const l = await db.listing.findFirst({
    where: { id, deletedAt: null },
    include: { category: { select: { slug: true, attributeSchema: true } } },
  });
  if (!l) return { error: NextResponse.json({ message: 'Anúncio não encontrado.' }, { status: 404 }) };
  if (l.userId !== userId) return { error: NextResponse.json({ message: 'Sem permissão.' }, { status: 403 }) };
  return { listing: l };
}

// PATCH /api/listings/[id] — editar campos e/ou mudar status. Só o dono.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { listing, error } = await ownedListing(params.id, user.id);
    if (error) return error;

    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;

    if (dto.images !== undefined && dto.images.some((i) => !isOfficialImageUrl(i.url) || (i.thumbUrl != null && !isOfficialImageUrl(i.thumbUrl)))) {
      return NextResponse.json({ message: 'Imagem inválida.' }, { status: 400 });
    }

    const data: Prisma.ListingUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.spot !== undefined) data.spot = dto.spot;
    if (dto.shippable !== undefined) data.shippable = dto.shippable;
    if (dto.attributes !== undefined) {
      data.attributes = validateAttributes(listing!.category.attributeSchema as any, dto.attributes) as Prisma.InputJsonValue;
    }
    if (listing!.hasBarra) {
      if (dto.kitePrice !== undefined) data.kitePrice = dto.kitePrice;
      if (dto.barraPrice !== undefined) data.barraPrice = dto.barraPrice;
      if (dto.barraAttributes !== undefined) {
        const barraCat = await db.category.findUnique({ where: { slug: 'barra' } });
        data.barraAttributes = validateAttributes(barraCat!.attributeSchema as any, dto.barraAttributes) as Prisma.InputJsonValue;
      }
    }
    if (dto.images !== undefined) {
      if (listing!.hasBarra) {
        const hasKite = dto.images.some((i) => i.component === 'kite');
        const hasBarra = dto.images.some((i) => i.component === 'barra');
        if (!hasKite || !hasBarra) return NextResponse.json({ message: 'O kit precisa de pelo menos uma foto do kite e uma da barra.' }, { status: 400 });
      }
      data.images = { deleteMany: {}, create: dto.images.map((img, i) => ({ url: img.url, thumbUrl: img.thumbUrl ?? null, component: img.component ?? null, position: i })) };
    }

    const updated = await db.listing.update({ where: { id: params.id }, data, include: { images: true } });
    revalidateTag(LISTINGS_TAG);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}

// DELETE /api/listings/[id] — exclusão soft (deletedAt). Só o dono.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { error } = await ownedListing(params.id, user.id);
    if (error) return error;
    await db.listing.update({ where: { id: params.id }, data: { deletedAt: new Date(), status: 'archived' } });
    revalidateTag(LISTINGS_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro.' }, { status: 400 });
  }
}
