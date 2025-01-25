// src/storage/s3-storage.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../common/interfaces/storage.interface';
import { envs } from '../config/envs';

@Injectable()
export class S3StorageService implements StorageService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: envs.storage.s3.region,
      credentials: {
        accessKeyId: envs.storage.s3.accessKey,
        secretAccessKey: envs.storage.s3.secretKey,
      },
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const key = `${Date.now()}-${file.originalname}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return key;
  }

  async delete(filename: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: filename,
    }));
  }

  async get(filename: string): Promise<Buffer> {
    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: envs.storage.s3.bucket,
      Key: filename,
    }));

    return Buffer.from(await response.Body.transformToByteArray());
  }
}