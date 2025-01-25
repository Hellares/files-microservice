import { Injectable } from '@nestjs/common';
import { envs } from '../config/envs';
import { StorageService } from '../common/interfaces/storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';

@Injectable()
export class StorageFactory {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly s3StorageService: S3StorageService,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  getStorage(provider?: string): StorageService {
    switch (provider || envs.storage.type) {
      case 's3':
        return this.s3StorageService;
      case 'cloudinary':
        return this.cloudinaryStorageService;
      case 'firebase':
        return this.firebaseStorageService;
      default:
        return this.localStorageService;
    }
  }
}