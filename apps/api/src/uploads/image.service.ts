import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from './storage.service';

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export interface ProcessedImage {
  url: string; // imagem principal (máx 1600px, EXIF removido)
  thumbUrl: string; // thumbnail 400px
}

// Processamento server-side: valida tipo/tamanho, REMOVE EXIF/GPS
// (segurança do vendedor — anti-roubo), faz resize e gera thumbnail.
@Injectable()
export class ImageService {
  constructor(private storage: StorageService) {}

  async process(file: Express.Multer.File): Promise<ProcessedImage> {
    if (!file) throw new BadRequestException('Arquivo ausente.');
    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido (use JPEG, PNG ou WebP).');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Imagem maior que 12 MB.');
    }

    // sharp não copia metadados por padrão -> EXIF/GPS são descartados.
    const main = await sharp(file.buffer)
      .rotate() // aplica orientação EXIF antes de descartá-la
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const thumb = await sharp(file.buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();

    const url = await this.storage.save(main, 'jpg');
    const thumbUrl = await this.storage.save(thumb, 'jpg');
    return { url, thumbUrl };
  }
}
