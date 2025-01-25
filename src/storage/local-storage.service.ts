// src/storage/local-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../common/interfaces/storage.interface';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { envs } from '../config/envs';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadPath: string;

  constructor() {
    this.uploadPath = envs.storage.local.path;
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
      this.logger.log(`Created upload directory at ${this.uploadPath}`);
    }
  }

  async upload(file: Express.Multer.File): Promise<string> {
    try {
      const filename = `${uuid()}-${file.originalname}`;
      const filePath = path.join(this.uploadPath, filename);
      await fs.writeFile(filePath, file.buffer);
      return filename;
    } catch (error) {
      this.logger.error('Error uploading file locally:', error);
      throw new Error('Error uploading file');
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadPath, filename);
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error('Error deleting file locally:', error);
      throw new Error('Error deleting file');
    }
  }

  async get(filename: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.uploadPath, filename);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error('Error reading file locally:', error);
      throw new Error('Error reading file');
    }
  }
}