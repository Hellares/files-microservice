import { Injectable, Logger } from '@nestjs/common';
import { StorageFactory } from '../storage/storage.factory';
import { FileProcessorService } from './file-processor.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private uploadChunks = new Map<string, Map<number, Buffer>>();
  private uploadMetadata = new Map<string, any>();

  constructor(
    private readonly storageFactory: StorageFactory,
    private readonly fileProcessor: FileProcessorService
  ) {}

  
  // async uploadFile(
  //   file: Express.Multer.File, 
  //   provider?: string,
  //   type?: string
  // ) {
  //   try {
  //     // Procesar el archivo según su tipo
  //     const { buffer, processedInfo } = await this.fileProcessor.validateAndProcessFile(file, type);

  //     // Crear archivo procesado
  //     const processedFile: Express.Multer.File = {
  //       ...file,
  //       buffer,
  //       size: buffer.length
  //     };

  //     // Subir al almacenamiento
  //     const storage = this.storageFactory.getStorage(provider);
  //     const filename = await storage.upload(processedFile);
      
  //     return {
  //       filename,
  //       originalName: file.originalname,
  //       mimetype: file.mimetype,
  //       size: processedFile.size,
  //       provider: provider || 'local',
  //       processedInfo // Incluir información del procesamiento
  //     };
  //   } catch (error) {
  //     this.logger.error('Error uploading file:', {
  //       error: error.message,
  //       filename: file.originalname,
  //       type
  //     });
  //     throw error;
  //   }
  // }

  // async uploadFile(
  //   file: Express.Multer.File, 
  //   provider?: string,
  //   type?: string
  // ) {
  //   try {
  //     const { buffer, processedInfo } = await this.fileProcessor.validateAndProcessFile(file, type);

  //     const processedFile: Express.Multer.File = {
  //       ...file,
  //       buffer,
  //       size: buffer.length
  //     };

  //     const storage = this.storageFactory.getStorage(provider);
  //     const filename = await storage.upload(processedFile);
      
  //     return {
  //       filename,
  //       originalName: file.originalname,
  //       mimetype: file.mimetype,
  //       size: processedFile.size,
  //       provider: provider || 'local',
  //       processedInfo
  //     };
  //   } catch (error) {
  //     this.logger.error('Error uploading file:', {
  //       error: error.message,
  //       filename: file.originalname,
  //       type
  //     });
  //     throw error;
  //   }
  // }

  // async handleUploadStart(data: { 
  //   uploadId: string, 
  //   totalChunks: number, 
  //   metadata: any 
  // }) {
  //   try {
  //     this.logger.debug(`Iniciando upload por chunks. ID: ${data.uploadId}, Total chunks: ${data.totalChunks}`);
  //     this.uploadChunks.set(data.uploadId, new Map());
  //     this.uploadMetadata.set(data.uploadId, data.metadata);
  //     return { success: true };
  //   } catch (error) {
  //     this.logger.error(`Error iniciando upload ${data.uploadId}:`, error);
  //     throw error;
  //   }
  // }

  // async handleChunkUpload(data: { 
  //   uploadId: string, 
  //   chunkIndex: number, 
  //   chunk: Buffer,
  //   isLast: boolean 
  // }) {
  //   try {
  //     const chunks = this.uploadChunks.get(data.uploadId);
  //     if (!chunks) {
  //       throw new Error(`Upload ${data.uploadId} no inicializado`);
  //     }

  //     chunks.set(data.chunkIndex, data.chunk);
  //     this.logger.debug(`Chunk ${data.chunkIndex} recibido para upload ${data.uploadId}`);

  //     if (data.isLast) {
  //       return await this.finalizeUpload(data.uploadId);
  //     }

  //     return { success: true };
  //   } catch (error) {
  //     this.logger.error(`Error procesando chunk para upload ${data.uploadId}:`, error);
  //     throw error;
  //   }
  // }

  // private async finalizeUpload(uploadId: string): Promise<any> {
  //   try {
  //     const chunks = this.uploadChunks.get(uploadId);
  //     const metadata = this.uploadMetadata.get(uploadId);
      
  //     if (!chunks || !metadata) {
  //       throw new Error(`Datos de upload ${uploadId} no encontrados`);
  //     }

  //     this.logger.debug(`Finalizando upload ${uploadId}. Procesando ${chunks.size} chunks`);

  //     const sortedChunks = Array.from(chunks.entries())
  //       .sort(([a], [b]) => a - b)
  //       .map(([_, chunk]) => chunk);
      
  //     const completeBuffer = Buffer.concat(sortedChunks);

  //     const file = {
  //       buffer: completeBuffer,
  //       ...metadata
  //     };

  //     const { buffer, processedInfo } = await this.fileProcessor
  //       .validateAndProcessFile(file, metadata.type);

  //     const storage = this.storageFactory.getStorage(metadata.provider);
  //     const filename = await storage.upload({
  //       ...file,
  //       buffer
  //     });

  //     this.logger.debug(`Upload ${uploadId} completado exitosamente`);

  //     // Limpiar datos temporales
  //     this.uploadChunks.delete(uploadId);
  //     this.uploadMetadata.delete(uploadId);

  //     return {
  //       filename,
  //       originalName: metadata.originalname,
  //       size: buffer.length,
  //       type: metadata.type,
  //       processedInfo
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error finalizando upload ${uploadId}:`, error);
  //     // Limpiar en caso de error
  //     this.uploadChunks.delete(uploadId);
  //     this.uploadMetadata.delete(uploadId);
  //     throw error;
  //   }
  // }

  async handleUploadStart(data: { 
    uploadId: string, 
    totalChunks: number, 
    metadata: any 
  }) {
    try {
      const startTime = Date.now();
      this.logger.debug(`Iniciando upload por chunks. ID: ${data.uploadId}, Total: ${data.totalChunks}`);
      
      this.uploadChunks.set(data.uploadId, new Map());
      this.uploadMetadata.set(data.uploadId, data.metadata);
      
      this.logger.debug(`Inicialización completada en ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error iniciando upload ${data.uploadId}:`, error);
      throw error;
    }
  }

  async handleChunkUpload(data: { 
    uploadId: string, 
    chunkIndex: number, 
    chunk: Buffer,
    isLast: boolean 
  }) {
    const startTime = Date.now();
    try {
      const chunks = this.uploadChunks.get(data.uploadId);
      if (!chunks) {
        throw new Error(`Upload ${data.uploadId} no inicializado`);
      }

      chunks.set(data.chunkIndex, data.chunk);
      this.logger.debug(`Chunk ${data.chunkIndex} recibido (${data.chunk.length} bytes) en ${Date.now() - startTime}ms`);

      if (data.isLast) {
        return await this.finalizeUpload(data.uploadId);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error procesando chunk para upload ${data.uploadId}:`, error);
      throw error;
    }
  }

  private async finalizeUpload(uploadId: string): Promise<any> {
    const startTime = Date.now();
    try {
      const chunks = this.uploadChunks.get(uploadId);
      const metadata = this.uploadMetadata.get(uploadId);
      
      if (!chunks || !metadata) {
        throw new Error(`Datos de upload ${uploadId} no encontrados`);
      }

      this.logger.debug(`Iniciando finalización de upload ${uploadId}. Chunks: ${chunks.size}`);

      // Ordenar y concatenar chunks
      const sortedChunks = Array.from(chunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, chunk]) => chunk);
      
      const completeBuffer = Buffer.concat(sortedChunks);
      this.logger.debug(`Buffer completado: ${completeBuffer.length} bytes`);

      // Crear archivo para procesar
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: metadata.originalname,
        encoding: '7bit',
        mimetype: metadata.mimetype,
        size: completeBuffer.length,
        destination: '',
        filename: metadata.originalname,
        path: '',
        buffer: completeBuffer,
        stream: null as any
      };

      // Procesar archivo
      const processStart = Date.now();
      const { buffer, processedInfo } = await this.fileProcessor
        .validateAndProcessFile(file, metadata.type);
      this.logger.debug(`Procesamiento completado en ${Date.now() - processStart}ms`);

      // Subir a almacenamiento
      const uploadStart = Date.now();
      const storage = this.storageFactory.getStorage(metadata.provider);
      const processedFile: Express.Multer.File = {
        ...file,
        buffer,
        size: buffer.length
      };
      const filename = await storage.upload(processedFile);
      this.logger.debug(`Upload a storage completado en ${Date.now() - uploadStart}ms`);

      // Limpiar datos temporales
      this.uploadChunks.delete(uploadId);
      this.uploadMetadata.delete(uploadId);

      const totalTime = Date.now() - startTime;
      this.logger.debug(`Upload ${uploadId} completado. Tiempo total: ${totalTime}ms`);

      return {
        filename,
        originalName: metadata.originalname,
        size: buffer.length,
        type: metadata.type,
        processedInfo,
        timing: {
          totalTime,
          processingTime: Date.now() - processStart,
          uploadTime: Date.now() - uploadStart
        }
      };
    } catch (error) {
      this.logger.error(`Error finalizando upload ${uploadId}:`, error);
      this.uploadChunks.delete(uploadId);
      this.uploadMetadata.delete(uploadId);
      throw error;
    }
  }

  // Mantener los métodos existentes para compatibilidad
  async uploadFile(file: Express.Multer.File, provider?: string, type?: string) {
    try {
      const startTime = Date.now();
      
      const { buffer, processedInfo } = await this.fileProcessor.validateAndProcessFile(file, type);
      const processTime = Date.now() - startTime;

      const processedFile: Express.Multer.File = {
        ...file,
        buffer,
        size: buffer.length
      };

      const storage = this.storageFactory.getStorage(provider);
      const filename = await storage.upload(processedFile);
      
      const totalTime = Date.now() - startTime;
      
      this.logger.debug(`Upload completado:`, {
        filename: file.originalname,
        processTime,
        totalTime,
        size: buffer.length
      });

      return {
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: processedFile.size,
        provider: provider || 'local',
        processedInfo,
        timing: {
          totalTime,
          processTime
        }
      };
    } catch (error) {
      this.logger.error('Error uploading file:', {
        error: error.message,
        filename: file.originalname,
        type
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

  

  // async deleteFile(filename: string, provider?: string) {
  //   try {
  //     const storage = this.storageFactory.getStorage(provider);
  //     await storage.delete(filename);
  //     return { success: true };
  //   } catch (error) {
  //     this.logger.error('Error deleting file:', error);
  //     throw error;
  //   }
  // }

  // async getFile(filename: string, provider?: string) {
  //   try {
  //     const storage = this.storageFactory.getStorage(provider);
  //     return await storage.get(filename);
  //   } catch (error) {
  //     this.logger.error('Error getting file:', error);
  //     throw error;
  //   }
  // }
}
