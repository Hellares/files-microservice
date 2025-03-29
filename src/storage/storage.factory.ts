import { Injectable } from '@nestjs/common';
import { envs } from '../config/envs';
import { StorageService } from '../common/interfaces/storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { ElastikaStorageService } from './elastika-storage.service';
import { StorageProvider } from 'src/common/enums/storage-provider.enum';

@Injectable()
export class StorageFactory {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly s3StorageService: S3StorageService,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly elastikaStorageService: ElastikaStorageService
  ) {}

  getStorage(provider?: string): StorageService {
    switch (provider || envs.storage.type) {
      case StorageProvider.S3:
        return this.s3StorageService;
      case StorageProvider.CLOUDINARY:
        return this.cloudinaryStorageService;
      case StorageProvider.FIREBASE:
        return this.firebaseStorageService;
      case StorageProvider.ELASTIKA:
        return this.elastikaStorageService;
      case StorageProvider.LOCAL:
      default:
        return this.localStorageService;
    }
  }
}