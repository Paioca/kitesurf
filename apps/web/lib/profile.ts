import 'server-only';
import { db } from './db';
import type { Card } from './browse';

function brl(c: number) {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function getProfile(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, avatarUrl: true, instagramHandle: true, phoneVerified: true, emailVerified: true, role: true, createdAt: true },
  });
  if (!user) return null;

  const [reviewsRaw, salesCount, purchasesCount, listingsRaw] = await Promise.all([
    db.review.findMany({
      where: { reviewedId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { reviewer: { select: { name: true, avatarUrl: true } }, deal: { include: { listing: { select: { title: true } } } } },
    }),
    db.deal.count({ where: { sellerId: id, status: 'completed' } }),
    db.deal.count({ where: { buyerId: id, status: 'completed' } }),
    db.listing.findMany({
      where: { userId: id, status: 'active', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { images: { orderBy: { position: 'asc' }, take: 1 }, brand: true, model: true, category: true },
    }),
  ]);

  const ratingCount = reviewsRaw.length;
  const ratingAvg = ratingCount ? reviewsRaw.reduce((s, r) => s + r.rating, 0) / ratingCount : null;

  const listings: Card[] = listingsRaw.map((l) => {
    const a = (l.attributes ?? {}) as Record<string, any>;
    const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
    return {
      id: l.id, brand: l.brand?.name ?? '', model: l.model?.name ?? l.title, year: l.year ?? null,
      priceCents: l.price, priceLabel: brl(l.price), cat: l.category?.namePt ?? '', catSlug: l.category?.slug ?? '',
      ship: l.shippable, city: l.city, sizeM2, sizeLabel: sizeM2 ? `${sizeM2} m²` : (a.harness_size || l.category?.namePt || '—'),
      repair: Number(a.repairs_count ?? 0) > 0, includesBar: l.hasBarra === true, partOfKit: false, photo: l.images[0]?.thumbUrl ?? l.images[0]?.url ?? null,
    };
  });

  const reviews = reviewsRaw.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewerName: r.reviewer.name,
    gear: r.deal?.listing?.title ?? '',
  }));

  return {
    user,
    stats: { ratingAvg, ratingCount, salesCount, purchasesCount, activeCount: listings.length },
    listings,
    reviews,
  };
}
