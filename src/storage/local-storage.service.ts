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

  protected async doList(tenantId: string): Promise<Array<{filename: string, size?: number, createdAt?: Date, url?: string}>> {
    try {
      const dirPath = path.join(this.uploadPath, tenantId);
      
      try {
        await fs.access(dirPath);
      } catch {
        // Si el directorio no existe, devolver lista vacía
        return [];
      }
      
      const files = await fs.readdir(dirPath);
      
      const fileInfoPromises = files.map(async (filename) => {
        const filePath = path.join(dirPath, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      });
      
      return await Promise.all(fileInfoPromises);
    } catch (error) {
      this.logger.error({
        err: error,
        tenantId,
        operation: 'list'
      }, 'Error al listar archivos locales');
      throw error;
    }
  }

  protected getProviderName(): string {
    return StorageProvider.LOCAL;
  }
}