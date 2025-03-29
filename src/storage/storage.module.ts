import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { StorageFactory } from './storage.factory';
import { ConfigModule } from '@nestjs/config';
import { FirebaseStorageService } from './firebase-storage.service';
import { ElastikaStorageService } from './elastika-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    StorageFactory,
    LocalStorageService,
    S3StorageService,
    CloudinaryStorageService,
    FirebaseStorageService,
    ElastikaStorageService,
  ],
  exports: [StorageFactory,]
})
export class StorageModule {}