import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { StorageService } from '../common/interfaces/storage.interface';
import { envs } from '../config/envs';
import { Buffer } from 'buffer';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor() {
    cloudinary.config({
      cloud_name: envs.storage.cloudinary.cloudName,
      api_key: envs.storage.cloudinary.apiKey,
      api_secret: envs.storage.cloudinary.apiSecret
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    try {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto'
      });
  
      this.logger.debug(`File uploaded successfully to Cloudinary: ${result.public_id}`);
      return result.secure_url; // Devolvemos directamente el string de la URL
    } catch (error) {
      this.logger.error('Error uploading to Cloudinary:', error);
      throw new Error('Error uploading file to Cloudinary');
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      // Extraer el public_id
      const publicId = this.extractPublicId(filename);
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result !== 'ok') {
        throw new Error(`Error al eliminar archivo de Cloudinary: ${result.result}`);
      }

      this.logger.debug(`✅ Archivo eliminado correctamente de Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error('❌ Error eliminando de Cloudinary:', {
        error: error.message,
        filename,
        stack: error.stack
      });
      throw new Error(`Error eliminando archivo de Cloudinary: ${error.message}`);
    }
  }

  async get(filename: string): Promise<Buffer> {
    try {
      const result = await cloudinary.api.resource(filename);
      const response = await fetch(result.secure_url);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.error('Error getting file from Cloudinary:', error);
      throw new Error('Error retrieving file from Cloudinary');
    }
  }

  private extractPublicId(filename: string): string {
    // Remover extensión y parámetros de URL si existen
    return filename.split('.')[0].split('?')[0];
  }
}