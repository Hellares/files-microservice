import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { envs } from '../config/envs';
import { BaseStorageService } from './base-storage.service';
import { StorageProvider } from '../common/enums/storage-provider.enum';

@Injectable()
export class S3StorageService extends BaseStorageService {
  private s3Client: S3Client;

  constructor(logger: PinoLogger) {
    super(logger, 'S3Storage');
    
    this.s3Client = new S3Client({
      region: envs.storage.s3.region,
      credentials: {
        accessKeyId: envs.storage.s3.accessKey,
        secretAccessKey: envs.storage.s3.secretKey,
      },
    });
  }

  protected async doUpload(file: Express.Multer.File, path: string): Promise<string> {
    const key = path.includes('/') 
      ? `${path.split('/')[0]}/${Date.now()}-${file.originalname}`
      : `${Date.now()}-${file.originalname}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return key;
  }

  protected async doDelete(path: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: path,
    }));
  }

  protected async doGet(path: string): Promise<Buffer> {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: path,
    }));

    return Buffer.from(await response.Body.transformToByteArray());
  }

  protected getProviderName(): string {
    return StorageProvider.S3;
  }
}