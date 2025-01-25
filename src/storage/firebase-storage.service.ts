import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../common/interfaces/storage.interface';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { envs } from '../config/envs';

@Injectable()
export class FirebaseStorageService implements StorageService {
  private bucket: Bucket;
  private readonly logger = new Logger(FirebaseStorageService.name);

  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envs.storage.firebase.projectId,
        clientEmail: envs.storage.firebase.clientEmail,
        privateKey: envs.storage.firebase.privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: envs.storage.firebase.storageBucket
    });
    this.bucket = admin.storage().bucket();
  }

  async upload(file: Express.Multer.File): Promise<string> {
    try {
      const filename = `${Date.now()}-${file.originalname}`;
      const fileUpload = this.bucket.file(filename);
  
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });
  
      return filename;
    } catch (error) {
      this.logger.error('Error uploading to Firebase:', error);
      throw new Error('Error uploading file to Firebase');
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      const file = this.bucket.file(filename);
      await file.delete();
    } catch (error) {
      this.logger.error('Error deleting from Firebase:', error);
      throw new Error('Error deleting file from Firebase');
    }
  }

  async get(filename: string): Promise<Buffer> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error('File not found');
      }
  
      const [fileContent] = await file.download();
      return fileContent;
    } catch (error) {
      this.logger.error('Error getting file from Firebase:', error);
      throw new Error('Error retrieving file from Firebase');
    }
  }
}