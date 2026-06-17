import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Taxonomia controlada exposta para os dropdowns do front (sem login).
@Controller('catalog')
export class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({ orderBy: { namePt: 'asc' } });
  }

  @Get('brands')
  brands() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { models: { orderBy: { name: 'asc' } } },
    });
  }
}
