import { Injectable, Logger } from '@nestjs/common';
import { StorageFactory } from '../storage/storage.factory';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(private readonly storageFactory: StorageFactory) {}

  async uploadFile(file: Express.Multer.File, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const filename = await storage.upload(file);
      
      return {
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        provider: provider || 'local'
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }
  

  async deleteFile(filename: string, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      await storage.delete(filename);
      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFile(filename: string, provider?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      return await storage.get(filename);
    } catch (error) {
      this.logger.error('Error getting file:', error);
      throw error;
    }
  }
}
