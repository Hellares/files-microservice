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
      // El error ya será manejado por el decorador CatchRmqErrors
      throw error;
    }
  }

  /**
   * Sube múltiples archivos de forma paralela
   * Utiliza Promise.all para procesar todos los archivos simultáneamente
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[], 
    provider?: string, 
    tenantId?: string,
    batchId?: string
  ) {
    try {
      const startTime = Date.now();
      
      // Subir todos los archivos en paralelo
      const uploadPromises = files.map(file => this.uploadFile(file, provider, tenantId));
      const results = await Promise.all(uploadPromises);
      
      const totalSize = results.reduce((sum, result) => sum + result.size, 0);
      const duration = Date.now() - startTime;
      
      // Log de resumen del batch
      this.logger.info({
        batchId,
        fileCount: files.length,
        totalSize,
        duration: `${duration}ms`,
        avgTimePerFile: `${Math.round(duration / files.length)}ms`,
        provider: provider || 'default',
        tenantId
      }, `Batch upload completado: ${files.length} archivos en ${duration}ms`);
      
      return {
        results,
        summary: {
          count: files.length,
          totalSize,
          duration,
          batchId
        }
      };
    } catch (error) {
      this.logger.error({
        err: error,
        fileCount: files.length,
        batchId,
        provider: provider || 'default',
        tenantId
      }, 'Error en subida múltiple');
      
      throw error;
    }
  }

  async deleteFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      await storage.delete(filename, tenantId);
      
      return { 
        success: true,
        tenantId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Elimina múltiples archivos de forma paralela
   */
  async deleteMultipleFiles(
    filenames: string[],
    provider?: string,
    tenantId?: string
  ) {
    try {
      const startTime = Date.now();
      
      // Eliminar todos los archivos en paralelo
      const deletePromises = filenames.map(filename => 
        this.deleteFile(filename, provider, tenantId)
          .catch(error => ({
            success: false,
            filename,
            error: error.message
          }))
      );
      
      const results = await Promise.all(deletePromises);
      const duration = Date.now() - startTime;
      
      // Contabilizar éxitos y errores
      const successful = results.filter(result => result.success).length;
      const failed = results.length - successful;
      
      this.logger.info({
        fileCount: filenames.length,
        successful,
        failed,
        duration: `${duration}ms`,
        provider: provider || 'default',
        tenantId
      }, `Eliminación por lotes completada: ${successful} éxitos, ${failed} fallos`);
      
      return {
        results,
        summary: {
          total: filenames.length,
          successful,
          failed,
          duration
        }
      };
    } catch (error) {
      this.logger.error({
        err: error,
        fileCount: filenames.length,
        provider: provider || 'default',
        tenantId
      }, 'Error en eliminación múltiple');
      
      throw error;
    }
  }

  async getFile(filename: string, provider?: string, tenantId?: string) {
    try {
      const storage = this.storageFactory.getStorage(provider);
      const buffer = await storage.get(filename, tenantId);
      
      return buffer;
    } catch (error) {
      throw error;
    }
  }
}