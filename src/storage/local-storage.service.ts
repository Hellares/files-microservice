// // src/storage/local-storage.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { StorageService } from '../common/interfaces/storage.interface';
// import { promises as fs } from 'fs';
// import * as path from 'path';
// import { v4 as uuid } from 'uuid';
// import { envs } from '../config/envs';

// @Injectable()
// export class LocalStorageService implements StorageService {
//   private readonly logger = new Logger(LocalStorageService.name);
//   private readonly uploadPath: string;

//   constructor() {
//     this.uploadPath = envs.storage.local.path;
//     this.ensureUploadDirectory();
//   }

//   private async ensureUploadDirectory() {
//     try {
//       await fs.access(this.uploadPath);
//     } catch {
//       await fs.mkdir(this.uploadPath, { recursive: true });
//       this.logger.log(`Created upload directory at ${this.uploadPath}`);
//     }
//   }

//   async upload(file: Express.Multer.File): Promise<string> {
//     try {
//       const filename = `${uuid()}-${file.originalname}`;
//       const filePath = path.join(this.uploadPath, filename);
//       await fs.writeFile(filePath, file.buffer);
//       return filename;
//     } catch (error) {
//       this.logger.error('Error uploading file locally:', error);
//       throw new Error('Error uploading file');
//     }
//   }

//   async delete(filename: string): Promise<void> {
//     try {
//       const filePath = path.join(this.uploadPath, filename);
//       await fs.unlink(filePath);
//     } catch (error) {
//       this.logger.error('Error deleting file locally:', error);
//       throw new Error('Error deleting file');
//     }
//   }

//   async get(filename: string): Promise<Buffer> {
//     try {
//       const filePath = path.join(this.uploadPath, filename);
//       return await fs.readFile(filePath);
//     } catch (error) {
//       this.logger.error('Error reading file locally:', error);
//       throw new Error('Error reading file');
//     }
//   }
// }

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { envs } from '../config/envs';
import { BaseStorageService } from './base-storage.service';
import { StorageProvider } from '../common/enums/storage-provider.enum';

@Injectable()
export class LocalStorageService extends BaseStorageService {
  private readonly uploadPath: string;

  constructor(logger: PinoLogger) {
    super(logger, 'LocalStorage');
    this.uploadPath = envs.storage.local.path;
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
      this.logger.info(`Created upload directory at ${this.uploadPath}`);
    }
  }

  protected async doUpload(file: Express.Multer.File, filePath: string): Promise<string> {
    // Extraer el tenant del path
    const parts = filePath.split('/');
    const tenant = parts[0];
    
    // Asegurar que exista el directorio del tenant
    const tenantPath = path.join(this.uploadPath, tenant);
    try {
      await fs.access(tenantPath);
    } catch {
      await fs.mkdir(tenantPath, { recursive: true });
    }
    
    // Crear nombre único para el archivo
    const filename = `${uuid()}-${file.originalname}`;
    const tenantFilename = `${tenant}/${filename}`;
    const fullFilePath = path.join(this.uploadPath, tenantFilename);
    
    // Guardar el archivo
    await fs.writeFile(fullFilePath, file.buffer);
    
    return tenantFilename;
  }

  protected async doDelete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadPath, filePath);
    await fs.unlink(fullPath);
  }

  protected async doGet(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadPath, filePath);
    return await fs.readFile(fullPath);
  }

  protected getProviderName(): string {
    return StorageProvider.LOCAL;
  }
}