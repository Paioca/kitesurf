import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto, SearchListingsDto } from './dto';
import { validateAttributes } from './attribute-validator';

const PAGE_SIZE = 24;

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateListingDto) {
    if (dto.images.length < 3 || dto.images.length > 20) {
      throw new BadRequestException('Envie entre 3 e 20 fotos.');
    }
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Categoria inválida.');

    const attributes = validateAttributes(
      category.attributeSchema as any,
      dto.attributes,
    );

    return this.prisma.listing.create({
      data: {
        userId,
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
        images: {
          create: dto.images.map((img, i) => ({ url: img.url, position: i })),
        },
      },
      include: { images: true },
    });
  }

  // Busca pública — sem login. Filtro por tamanho via JSONB.
  async search(dto: SearchListingsDto) {
    const where: Prisma.ListingWhereInput = {
      status: 'active',
      deletedAt: null,
    };

    if (dto.category) where.category = { slug: dto.category };
    if (dto.city) where.city = { contains: dto.city, mode: 'insensitive' };
    if (dto.brandId) where.brandId = dto.brandId;
    if (dto.q) where.title = { contains: dto.q, mode: 'insensitive' };
    if (dto.shippable === 'true') where.shippable = true;
    if (dto.shippable === 'false') where.shippable = false;

    if (dto.priceMin != null || dto.priceMax != null) {
      where.price = {};
      if (dto.priceMin != null) where.price.gte = dto.priceMin;
      if (dto.priceMax != null) where.price.lte = dto.priceMax;
    }

    // Filtro de tamanho (size_m2) no JSONB — o diferencial de busca.
    const sizeFilters: Prisma.ListingWhereInput[] = [];
    if (dto.sizeMin != null) {
      sizeFilters.push({ attributes: { path: ['size_m2'], gte: dto.sizeMin } });
    }
    if (dto.sizeMax != null) {
      sizeFilters.push({ attributes: { path: ['size_m2'], lte: dto.sizeMax } });
    }
    if (sizeFilters.length) where.AND = sizeFilters;

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      dto.sort === 'price_asc'
        ? { price: 'asc' }
        : dto.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const page = Math.max(1, dto.page ?? 1);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          brand: true,
          model: true,
          category: true,
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: { position: 'asc' } },
        brand: true,
        model: true,
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            instagramHandle: true,
            phoneVerified: true,
            createdAt: true,
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Anúncio não encontrado.');
    return listing;
  }

  // Mudança de status com ownership check (bug nº 1 de marketplace júnior).
  async setStatus(
    userId: string,
    id: string,
    status: 'active' | 'paused' | 'sold' | 'archived',
  ) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing || listing.deletedAt) throw new NotFoundException();
    if (listing.userId !== userId) {
      throw new ForbiddenException('Você não é o dono deste anúncio.');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status, lastConfirmedAt: new Date() },
    });
  }

  async listMine(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    });
  }
}
