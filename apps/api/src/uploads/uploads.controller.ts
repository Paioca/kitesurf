import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('uploads')
export class UploadsController {
  constructor(private images: ImageService) {}

  // Upload de 1 imagem -> retorna { url, thumbUrl }. Exige login.
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.images.process(file);
  }
}
