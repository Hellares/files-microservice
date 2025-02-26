import { Injectable, Logger } from '@nestjs/common';
import { StorageFactory } from '../storage/storage.factory';


@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly storageFactory: StorageFactory
  ) {}

  async uploadFile(file: Express.Multer.File, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const filename = await storage.upload(file);
      
      return {
        filename,
        originalName: file.originalname,
        size: file.size
      };
    } catch (error) {
      this.logger.error('Error en upload:', {
        filename: file.originalname,
        error: error.message
      });
      throw error;
    }
  }

  async deleteFile(filename: string, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      await storage.delete(filename);
      return { success: true };
    } catch (error) {
      this.logger.error('Error al eliminar:', {
        filename,
        error: error.message
      });
      throw error;
    }
  }

  async getFile(filename: string, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      return await storage.get(filename);
    } catch (error) {
      this.logger.error('Error al obtener:', {
        filename,
        error: error.message
      });
      throw error;
    }
  }
}