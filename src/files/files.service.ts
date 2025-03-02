import { Injectable, Logger } from '@nestjs/common';
import { StorageFactory } from '../storage/storage.factory';
// import { FileUrlService } from './url.service';


@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  

  constructor(
    private readonly storageFactory: StorageFactory,
    // private readonly fileUrlService: FileUrlService
  ) {}

  async uploadFile(file: Express.Multer.File, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const filename = await storage.upload(file, tenantId);

      this.logger.debug(`Archivo subido: ${filename}${tenantId ? ` para tenant: ${tenantId}` : ''}`);
   
      return {
        filename,
        originalName: file.originalname,
        size: file.size,
        tenantId: tenantId,
      };
    } catch (error) {
      this.logger.error('Error en upload:', {
        filename: file.originalname,
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  async deleteFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      await storage.delete(filename, tenantId);
      
      this.logger.debug(`Archivo eliminado: ${filename}${tenantId ? ` de tenant: ${tenantId}` : ''}`);
      
      return { 
        success: true,
        tenantId
      };
    } catch (error) {
      this.logger.error('Error al eliminar:', {
        filename,
        error: error.message,
        tenantId
      });
      throw error;
    }
  }

  async getFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const buffer = await storage.get(filename, tenantId);
      
      this.logger.debug(`Archivo obtenido: ${filename}${tenantId ? ` de tenant: ${tenantId}` : ''}`);
      
      return buffer;
    } catch (error) {
      this.logger.error('Error al obtener:', {
        filename,
        error: error.message,
        tenantId
      });
      throw error;
    }
  }
}