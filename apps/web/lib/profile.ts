import 'server-only';
import { cache } from 'react';
import { db } from './db';
import { COUNTS_AS_SALE_STATUSES } from './deals';
import type { Card } from './browse';

function brl(c: number) {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pickPhoto(images: Array<{ component: string | null; thumbUrl: string | null; url: string }>, component: string) {
  const img = images.find((i) => i.component === component) ?? images[0];
  return img?.thumbUrl ?? img?.url ?? null;
}

// cache(): generateMetadata + a página do perfil compartilham uma query/request.
export const getProfile = cache(async (id: string) => {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, avatarUrl: true, phoneVerified: true, emailVerified: true, role: true, locale: true, createdAt: true },
  });
  if (!user) return null;

  // Dois predicados §4: review pública = SÓ completed; "conta como venda" inclui
  // reversal_requested/disputed (provisório) — por isso não dá pra reusar o mesmo filtro.
  const reviewWhere = { reviewedId: id, deal: { status: 'completed' as const } };
  const saleStatusWhere = { status: { in: COUNTS_AS_SALE_STATUSES } };
  // Mesma regra do browse: ativo, não-excluído e em categoria ainda ativa (fora do MVP some).
  const publicListingWhere = { userId: id, status: 'active' as const, deletedAt: null, category: { is: { active: true } } };
  const [reviewsRaw, ratingAgg, salesCount, purchasesCount, listingsRaw, activeCount] = await Promise.all([
    // só reviews de negócios concluídos (os dois confirmaram) ficam públicas.
    // take: 30 é SÓ pra exibição — a nota/contagem agregam sobre TODAS (ratingAgg).
    db.review.findMany({
      where: reviewWhere,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { reviewer: { select: { name: true, avatarUrl: true } }, deal: { include: { listing: { select: { title: true } } } } },
    }),
    db.review.aggregate({ where: reviewWhere, _avg: { rating: true }, _count: { rating: true } }),
    db.deal.count({ where: { sellerId: id, ...saleStatusWhere } }),
    db.deal.count({ where: { buyerId: id, ...saleStatusWhere } }),
    db.listing.findMany({
      where: publicListingWhere,
      orderBy: { createdAt: 'desc' },
      take: 12, // só exibição; o total é activeCount
      include: { images: { orderBy: { position: 'asc' }, take: 8 }, brand: true, model: true, barraBrand: true, barraModel: true, category: true },
    }),
    db.listing.count({ where: publicListingWhere }),
  ]);

  const ratingCount = ratingAgg._count.rating;
  const ratingAvg = ratingAgg._avg.rating ?? null;

  const listings: Card[] = listingsRaw.map((l) => {
    const a = (l.attributes ?? {}) as Record<string, any>;
    const ba = (l.barraAttributes ?? {}) as Record<string, any>;
    const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
    const showBarra = l.hasBarra === true && l.kiteSoldAt != null && l.barraSoldAt == null && l.barraPrice != null;
    if (showBarra) {
      const legacyBrand = typeof ba.compatible_brand === 'string' ? ba.compatible_brand : '';
      return {
        id: l.id, brand: l.barraBrand?.name ?? legacyBrand, model: l.barraModel?.name ?? 'Barra do kit', year: l.barraYear ?? null,
        priceCents: l.barraPrice ?? l.price, priceLabel: brl(l.barraPrice ?? l.price), priceNote: 'só a barra', cat: 'Barra', catSlug: 'barra',
        ship: l.shippable, city: l.city, sizeM2: null, sizeLabel: 'Barra', condLabel: null,
        repair: false, includesBar: false, partOfKit: true, favorited: false, photo: pickPhoto(l.images, 'barra'),
      };
    }
    return {
      id: l.id, brand: l.brand?.name ?? '', model: l.model?.name ?? l.title, year: l.year ?? null,
      priceCents: l.price, priceLabel: brl(l.price), priceNote: l.hasBarra ? 'kit completo' : null, cat: l.category?.namePt ?? '', catSlug: l.category?.slug ?? '',
      ship: l.shippable, city: l.city, sizeM2, sizeLabel: sizeM2 ? `${sizeM2} m²` : (a.harness_size || l.category?.namePt || 'Não informado'), condLabel: null,
      repair: Number(a.repairs_count ?? 0) > 0, includesBar: l.hasBarra === true, partOfKit: false, favorited: false, photo: pickPhoto(l.images, 'kite'),
    };
  });

  const reviews = reviewsRaw.map((r) => ({
    id: r.id,
    rating: r.rating,
    tags: r.tags ?? [],
    comment: r.comment,
    createdAt: r.createdAt,
    reviewerName: r.reviewer.name,
    gear: r.deal?.listing?.title ?? '',
  }));

  return {
    user,
    stats: { ratingAvg, ratingCount, salesCount, purchasesCount, activeCount },
    listings,
    reviews,
  };
});
