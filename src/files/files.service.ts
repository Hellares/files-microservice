import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { StorageFactory } from '../storage/storage.factory';


@Injectable()
export class FilesService {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';
  

  constructor(
    private readonly storageFactory: StorageFactory,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('FilesService');
  }

  async uploadFile(file: Express.Multer.File, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const filename = await storage.upload(file, tenantId);

      // Log solo en desarrollo
      if (this.isDevelopment) {
        this.logger.info({ 
          filename,
          originalName: file.originalname,
          size: file.size,
          provider: provider || 'default',
          tenantId
        }, 'Archivo subido');
      }
   
      return {
        filename,
        originalName: file.originalname,
        size: file.size,
        tenantId: tenantId,
      };
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename: file.originalname,
        size: file.size,
        provider: provider || 'default',
        tenantId
      }, 'Error en upload');
      throw error;
    }
  }

  async deleteFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      await storage.delete(filename, tenantId);
      
      // Log solo en desarrollo
      if (this.isDevelopment) {
        this.logger.debug({ 
          filename,
          provider: provider || 'default',
          tenantId
        }, 'Archivo eliminado');
      }
      
      return { 
        success: true,
        tenantId
      };
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename,
        provider: provider || 'default',
        tenantId
      }, 'Error al eliminar archivo');
      throw error;
    }
  }

  async getFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const buffer = await storage.get(filename, tenantId);
      
      if (this.isDevelopment) {
        this.logger.debug({ 
          filename,
          bufferSize: buffer.length,
          provider: provider || 'default',
          tenantId
        }, 'Archivo obtenido');
      }
      
      return buffer;
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename,
        provider: provider || 'default',
        tenantId
      }, 'Error al obtener archivo');
      throw error;
    }
  }
}