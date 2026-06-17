import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto, SearchListingsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  // ---- Públicos (sem login — destrava topo do funil) ----
  @Get()
  search(@Query() query: SearchListingsDto) {
    return this.listings.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }

  // ---- Protegidos ----
  @UseGuards(JwtAuthGuard)
  @Get('me/list')
  mine(@CurrentUser() userId: string) {
    return this.listings.listMine(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateListingDto) {
    return this.listings.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  setStatus(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body('status') status: 'active' | 'paused' | 'sold' | 'archived',
  ) {
    return this.listings.setStatus(userId, id, status);
  }
}
