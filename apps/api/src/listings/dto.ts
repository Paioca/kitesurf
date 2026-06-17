import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImageInputDto {
  @IsString() url!: string;
  @IsOptional() @IsString() thumbUrl?: string;
}

export class CreateListingDto {
  @IsUUID() categoryId!: string;

  @IsOptional() @IsUUID() brandId?: string;
  @IsOptional() @IsUUID() modelId?: string;
  @IsOptional() @IsInt() @Min(1990) @Max(2100) year?: number;

  // Validado contra Category.attributeSchema no service.
  @IsObject() attributes!: Record<string, unknown>;

  @IsString() @MinLength(4) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;

  @IsInt() @Min(100) price!: number; // centavos

  @IsString() city!: string;
  @IsOptional() @IsString() spot?: string;

  @IsBoolean() shippable!: boolean;

  // mín 3 / máx 20 fotos (regra da doc).
  @IsArray()
  @Type(() => ImageInputDto)
  images!: ImageInputDto[];
}

// Query de busca pública (sem login). Busca por tamanho é o "aha".
export class SearchListingsDto {
  @IsOptional() @IsString() category?: string; // slug
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() q?: string; // texto livre (título)

  // Filtro de tamanho (kite m², etc.) — casa com attributes.size_m2.
  @IsOptional() @Type(() => Number) @IsInt() sizeMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() sizeMax?: number;

  @IsOptional() @Type(() => Number) @IsInt() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() priceMax?: number;

  @IsOptional() @IsString() shippable?: string; // 'true' | 'false'
  @IsOptional() @IsString() sort?: 'recent' | 'price_asc' | 'price_desc';

  @IsOptional() @Type(() => Number) @IsInt() page?: number;
}
