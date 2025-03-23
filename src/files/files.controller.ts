import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { FilesService } from './files.service';
import { PinoLogger } from 'nestjs-pino';
import { ensureBuffer, createFileFromBase64 } from 'src/common/utils/buffer.utils';
import { CatchRmqErrors } from '../common/decorators/catch-rmq-errors.decorator';

@Controller()
export class FilesController {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(
    private readonly filesService: FilesService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('FilesController');
  }

  
  @MessagePattern('file.upload.optimized')
  @CatchRmqErrors()
  async uploadFileOptimized(
    @Payload() data: { 
      file: { 
        originalname: string,
        mimetype: string,
        size: number,
        bufferBase64: string
      }, 
      provider?: string,
      tenantId?: string
    }, 
    @Ctx() context: RmqContext
  ) {
    // Usar la utilidad para crear un objeto File a partir del base64
    const file = createFileFromBase64(
      data.file.originalname,
      data.file.mimetype,
      data.file.size,
      data.file.bufferBase64
    );
    
    return await this.filesService.uploadFile(
      file, 
      data.provider, 
      data.tenantId
    );
  }

  /**
   * Endpoint para subir múltiples archivos a la vez en formato base64
   * Optimizado para transferencias eficientes a través de RabbitMQ
   */
  @MessagePattern('files.upload.batch')
  @CatchRmqErrors()
  async uploadMultipleFiles(
    @Payload() data: {
      files: {
        originalname: string,
        mimetype: string,
        size: number,
        bufferBase64: string
      }[],
      provider?: string,
      tenantId?: string,
      batchId?: string
    },
    @Ctx() context: RmqContext
  ) {
    // Convertir cada archivo base64 a un objeto File de Multer
    const files = data.files.map(fileData => 
      createFileFromBase64(
        fileData.originalname,
        fileData.mimetype,
        fileData.size,
        fileData.bufferBase64
      )
    );
    
    // Si se proporcionó un batchId, registrarlo
    if (data.batchId && this.isDevelopment) {
      this.logger.info({
        batchId: data.batchId,
        fileCount: files.length,
        operation: 'batch_upload'
      }, `Iniciando subida por lotes con ${files.length} archivos`);
    }

    // Procesar todos los archivos
    return await this.filesService.uploadMultipleFiles(
      files,
      data.provider,
      data.tenantId,
      data.batchId
    );
  }

  @MessagePattern('file.delete')
  @CatchRmqErrors()
  async deleteFile(
    @Payload() data: { 
      filename: string; 
      provider?: string;
      tenantId?: string;
    },
    @Ctx() context: RmqContext
  ) {
    return await this.filesService.deleteFile(
      data.filename, 
      data.provider, 
      data.tenantId
    );
  }

  /**
   * Endpoint para eliminar múltiples archivos a la vez
   */
  @MessagePattern('files.delete.batch')
  @CatchRmqErrors()
  async deleteMultipleFiles(
    @Payload() data: {
      filenames: string[];
      provider?: string;
      tenantId?: string;
    },
    @Ctx() context: RmqContext
  ) {
    return await this.filesService.deleteMultipleFiles(
      data.filenames,
      data.provider,
      data.tenantId
    );
  }

  @MessagePattern('file.get')
  @CatchRmqErrors()
  async getFile(
    @Payload() data: { 
      filename: string; 
      provider?: string;
      tenantId?: string;
    },
    @Ctx() context: RmqContext
  ) {
    return await this.filesService.getFile(
      data.filename, 
      data.provider, 
      data.tenantId
    );
  }
}