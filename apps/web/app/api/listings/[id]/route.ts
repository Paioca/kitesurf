import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/db';
import { getListing } from '../../../../lib/queries';
import { requireUser, getCurrentUser, UnauthorizedError } from '../../../../lib/session';
import { validateAttributes } from '../../../../lib/attributes';
import { isOfficialImageUrl } from '../../../../lib/storage';
import { canTransition, isEditable, isPubliclyVisible, type ListingStatus, ACTIVE_LISTING_LIMIT, activeListingWhere, MIN_LISTING_PRICE_CENTS } from '../../../../lib/listing-status';
import { openNegotiationExists } from '../../../../lib/deals';
import { removeListing, LifecycleError } from '../../../../lib/lifecycle';
import { type Component } from '../../../../lib/components';

export const runtime = 'nodejs';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const listing = await getListing(params.id);
  if (!listing) return NextResponse.json({ message: 'Anúncio não encontrado.' }, { status: 404 });
  // draft/paused/archived são privados do dono — terceiro recebe 404 (mesmo corpo do
  // inexistente, sem revelar que o anúncio existe e está oculto).
  if (!isPubliclyVisible(listing.status)) {
    const me = await getCurrentUser();
    if (!me || me.id !== listing.userId) return NextResponse.json({ message: 'Anúncio não encontrado.' }, { status: 404 });
  }
  return NextResponse.json(listing);
}

// Campos editáveis (todos opcionais) + status (pausar/reativar/arquivar).
// Categoria/tipo (kite vs kit) NÃO mudam por edição.
const patchSchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  attributes: z.record(z.any()).optional(),
  title: z.string().min(4).max(120).optional(),
  description: z.string().max(4000).nullable().optional(),
  price: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: 'O preço mínimo de um anúncio é R$100.' }).optional(),
  city: z.string().min(1).optional(),
  spot: z.string().nullable().optional(),
  shippable: z.boolean().optional(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string().optional(), component: z.enum(['kite', 'barra']).optional() })).min(3).max(40).optional(),
  kitePrice: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: 'O preço mínimo de um anúncio é R$100.' }).nullable().optional(),
  barraPrice: z.number().int().min(MIN_LISTING_PRICE_CENTS, { message: 'O preço mínimo de um anúncio é R$100.' }).nullable().optional(),
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
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    const { listing, error } = await ownedListing(params.id, user.id);
    if (error) return error;

    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
    const dto = parsed.data;

    // Máquina de estados: transição inválida (ex: sold→active) e edição de conteúdo
    // de um anúncio vendido/arquivado são bloqueadas — `sold` é terminal.
    const current = listing!.status as ListingStatus;
    if (dto.status && !canTransition(current, dto.status)) {
      return NextResponse.json({ message: 'Transição de status não permitida.' }, { status: 409 });
    }
    // Reativar (→active) reconta pro teto: como só 'active' conta, reativar um pausado
    // não pode furar o limite de 5 ativos.
    if (dto.status === 'active' && current !== 'active') {
      if ((await db.listing.count({ where: activeListingWhere(user.id) })) >= ACTIVE_LISTING_LIMIT) {
        return NextResponse.json({ message: `Você atingiu o limite de ${ACTIVE_LISTING_LIMIT} anúncios ativos. Pause ou exclua outro para reativar este.` }, { status: 409 });
      }
    }
    const hasContentEdit = Object.keys(dto).some((k) => k !== 'status');
    if (hasContentEdit && !isEditable(current)) {
      return NextResponse.json({ message: 'Não é possível editar um anúncio vendido ou arquivado.' }, { status: 409 });
    }

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
      // Proteção de disponibilidade por peça: não dá pra mexer numa peça já vendida,
      // nem REMOVER (preço → null) uma peça com negociação aberta (pedido aceito /
      // venda aguardando confirmação). Trocar o preço de uma peça em negociação é ok.
      const guards: Array<[Component, Date | null, number | null | undefined, number | null]> = [
        ['kite', listing!.kiteSoldAt, dto.kitePrice, listing!.kitePrice],
        ['barra', listing!.barraSoldAt, dto.barraPrice, listing!.barraPrice],
      ];
      for (const [comp, soldAt, newPrice, curPrice] of guards) {
        if (newPrice === undefined) continue;
        if (soldAt != null) return NextResponse.json({ message: `Esta peça (${comp}) já foi vendida; não dá pra alterar sua disponibilidade.` }, { status: 409 });
        if (newPrice === null && curPrice != null && (await openNegotiationExists(listing!.id, comp))) {
          return NextResponse.json({ message: `Há uma negociação em andamento para esta peça (${comp}). Conclua ou cancele antes de removê-la.` }, { status: 409 });
        }
      }
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
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}

// DELETE /api/listings/[id] — exclusão soft. Encerra pedidos abertos e bloqueia se há
// venda aguardando confirmação (lógica centralizada em removeListing).
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await requireUser();
    await removeListing(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    if (e instanceof LifecycleError) return NextResponse.json({ message: e.message }, { status: e.status });
    return errorResponse(e);
  }
}
