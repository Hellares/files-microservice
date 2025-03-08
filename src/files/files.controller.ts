import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { FilesService } from './files.service';
import { formatFileSize } from 'src/common/util/format-file-size.util';
import { PinoLogger } from 'nestjs-pino';



@Controller()
export class FilesController {

  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(
    private readonly filesService: FilesService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('FilesController');
  }

  @MessagePattern('file.upload')
  async uploadFile(
    @Payload() data: { 
      file: Express.Multer.File, 
      provider?: string,
      tenantId?: string
    }, 
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();
    const fileSize = formatFileSize(data.file.size);
  

    try {
      const file = {
        ...data.file,
        buffer: Buffer.from(data.file.buffer)
      };
      
      // Log debug solo en desarrollo
      if (this.isDevelopment) {
        this.logger.info({ 
          fileName: file.originalname, 
          fileSize, 
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Iniciando upload');
      }
      
      const result = await this.filesService.uploadFile(file, data.provider , data.tenantId);
      await this.safeAck(channel, originalMsg);
      
      
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        this.logger.info({ 
          fileName: file.originalname, 
          duration: `${duration}ms`, 
          fileSize,
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Upload completado');
      }
      
      return result;
      
    } catch (error) {

      await this.safeAck(channel, originalMsg);
      this.logger.error({ 
        err: error,
        fileName: data.file.originalname, 
        fileSize, 
        provider: data.provider || 'default',
        tenantId: data.tenantId
      }, 'Error en upload');

      throw new RpcException({
        message: `Error al subir archivo: ${error.message}`,
        statusCode: 500
      });
    }
  }

  @MessagePattern('file.delete')
  async deleteFile(
    @Payload() data: { 
      filename: string; 
      provider?: string;
      tenantId?: string; // Añadir tenantId
    },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      // Log debug solo en desarrollo
      if (this.isDevelopment) {
        this.logger.debug({ 
          fileName: data.filename, 
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Eliminando archivo');
      }
      
      const result = await this.filesService.deleteFile(data.filename, data.provider, data.tenantId);
      await this.safeAck(channel, originalMsg);
      
            // Log de éxito solo en desarrollo
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        this.logger.debug({ 
          fileName: data.filename, 
          duration: `${duration}ms`,
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Archivo eliminado');
      }
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error({ 
        err: error,
        fileName: data.filename,
        provider: data.provider || 'default',
        tenantId: data.tenantId
      }, 'Error al eliminar archivo');

      throw new RpcException({
        message: `Error al eliminar archivo: ${error.message}`,
        statusCode: 500
      });
    }
  }

  @MessagePattern('file.get')
  async getFile(
    @Payload() data: { 
      filename: string; 
      provider?: string;
      tenantId?: string; // Añadir tenantId
    },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      // Log debug solo en desarrollo
      if (this.isDevelopment) {
        this.logger.info({ 
          fileName: data.filename,
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Descargando archivo');
      }
      
      const result = await this.filesService.getFile(data.filename, data.provider, data.tenantId);
      await this.safeAck(channel, originalMsg);
      
      // Log de éxito solo en desarrollo
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        this.logger.info({ 
          fileName: data.filename, 
          duration: `${duration}ms`,
          provider: data.provider || 'default',
          tenantId: data.tenantId
        }, 'Archivo descargado');
      }
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error({ 
        err: error,
        fileName: data.filename,
        provider: data.provider || 'default',
        tenantId: data.tenantId
      }, 'Error al descargar archivo');
      throw new RpcException({
        message: `Error al obtener archivo: ${error.message}`,
        statusCode: 500
      });
    }
  }

  private async safeAck(channel: any, message: any): Promise<void> {
    try {
      if (channel?.ack && message) {
        await channel.ack(message);
      }
    } catch (error) {
      this.logger.error({ 
        err: error,
        operation: 'rabbitmq_ack'
      }, 'Error en ACK RabbitMQ');
    }
  }
}