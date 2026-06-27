import 'server-only';
import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { db } from './db';

const PAGE_SIZE = 48;

export function getCategories() {
  return db.category.findMany({ where: { active: true }, orderBy: { namePt: 'asc' } });
}

export function getBrands() {
  return db.brand.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      models: { orderBy: { name: 'asc' }, select: { id: true, name: true, categoryId: true } },
    },
  });
}

export interface SearchParams {
  category?: string;
  city?: string;
  brandId?: string;
  q?: string;
  sizeMin?: number;
  sizeMax?: number;
  priceMin?: number;
  priceMax?: number;
  shippable?: string;
  sort?: string;
  page?: number;
}

export async function searchListings(p: SearchParams) {
  const where: Prisma.ListingWhereInput = { status: 'active', deletedAt: null };
  if (p.category) where.category = { slug: p.category };
  if (p.city) where.city = { contains: p.city, mode: 'insensitive' };
  if (p.brandId) where.brandId = p.brandId;
  if (p.q) where.title = { contains: p.q, mode: 'insensitive' };
  if (p.shippable === 'true') where.shippable = true;
  if (p.shippable === 'false') where.shippable = false;
  if (p.priceMin != null || p.priceMax != null) {
    where.price = {};
    if (p.priceMin != null) where.price.gte = p.priceMin;
    if (p.priceMax != null) where.price.lte = p.priceMax;
  }
  const sizeFilters: Prisma.ListingWhereInput[] = [];
  if (p.sizeMin != null) sizeFilters.push({ attributes: { path: ['size_m2'], gte: p.sizeMin } });
  if (p.sizeMax != null) sizeFilters.push({ attributes: { path: ['size_m2'], lte: p.sizeMax } });
  if (sizeFilters.length) where.AND = sizeFilters;

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    p.sort === 'price_asc' ? { price: 'asc' } : p.sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' };

  // Paginação defensiva: page inteiro positivo (?? não pega NaN) e clamp ao total
  // (?page=abc / negativo / gigante não geram skip=NaN nem páginas vazias).
  const total = await db.listing.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reqPage = Number.isFinite(p.page) ? Math.floor(p.page as number) : 1;
  const page = Math.min(totalPages, Math.max(1, reqPage));
  const items = await db.listing.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      brand: true,
      model: true,
      barraBrand: true,
      barraModel: true,
      category: true,
    },
  });
  return { items, total, page, pageSize: PAGE_SIZE };
}

// cache(): generateMetadata + a página do anúncio compartilham uma única query/request.
export const getListing = cache(async (id: string) => {
  return db.listing.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { position: 'asc' } },
      brand: true,
      model: true,
      barraBrand: true,
      barraModel: true,
      category: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          phoneVerified: true,
          createdAt: true,
        },
      },
    },
  });
});
