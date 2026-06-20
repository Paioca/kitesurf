import 'server-only';
import { cache } from 'react';
import { db } from './db';
import type { Card } from './browse';

function brl(c: number) {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// cache(): generateMetadata + a página do perfil compartilham uma query/request.
export const getProfile = cache(async (id: string) => {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, avatarUrl: true, instagramHandle: true, phoneVerified: true, emailVerified: true, role: true, locale: true, createdAt: true },
  });
  if (!user) return null;

  const reviewWhere = { reviewedId: id, deal: { status: 'completed' as const } };
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
    db.deal.count({ where: { sellerId: id, status: 'completed' } }),
    db.deal.count({ where: { buyerId: id, status: 'completed' } }),
    db.listing.findMany({
      where: { userId: id, status: 'active', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 12, // só exibição; o total é activeCount
      include: { images: { orderBy: { position: 'asc' }, take: 1 }, brand: true, model: true, category: true },
    }),
    db.listing.count({ where: { userId: id, status: 'active', deletedAt: null } }),
  ]);

  const ratingCount = ratingAgg._count.rating;
  const ratingAvg = ratingAgg._avg.rating ?? null;

  const listings: Card[] = listingsRaw.map((l) => {
    const a = (l.attributes ?? {}) as Record<string, any>;
    const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
    return {
      id: l.id, brand: l.brand?.name ?? '', model: l.model?.name ?? l.title, year: l.year ?? null,
      priceCents: l.price, priceLabel: brl(l.price), cat: l.category?.namePt ?? '', catSlug: l.category?.slug ?? '',
      ship: l.shippable, city: l.city, sizeM2, sizeLabel: sizeM2 ? `${sizeM2} m²` : (a.harness_size || l.category?.namePt || '—'), condLabel: null,
      repair: Number(a.repairs_count ?? 0) > 0, includesBar: l.hasBarra === true, partOfKit: false, favorited: false, photo: l.images[0]?.thumbUrl ?? l.images[0]?.url ?? null,
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
