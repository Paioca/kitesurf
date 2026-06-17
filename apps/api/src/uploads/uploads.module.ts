import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { ImageService } from './image.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [UploadsController],
  providers: [ImageService, StorageService],
  exports: [ImageService, StorageService],
})
export class UploadsModule {}
