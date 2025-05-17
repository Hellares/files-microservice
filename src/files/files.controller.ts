import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { FilesService } from './files.service';
import { PinoLogger } from 'nestjs-pino';
import { ensureBuffer, createFileFromBase64 } from 'src/common/utils/buffer.utils';
import { CatchRmqErrors } from '../common/decorators/catch-rmq-errors.decorator';
import { StorageQuotaGuard } from 'src/guard/storage-quota.guard';

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
  @UseGuards(StorageQuotaGuard)
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

  @MessagePattern('file.get') //descargar file
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

  @MessagePattern('files.list') //listar files del vps directamente
  @CatchRmqErrors()
  async listFiles(
    @Payload() data: { 
      tenantId: string;
      provider?: string;
    },
    @Ctx() context: RmqContext
  ) {
    return await this.filesService.listFiles(
      data.tenantId,
      data.provider, 
    );
  }
}