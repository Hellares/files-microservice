import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { FilesService } from './files.service';
import { formatFileSize } from 'src/common/util/format-file-size.util';



@Controller()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

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
      
      this.logger.debug(`📤 Iniciando upload: ${file.originalname} (${fileSize})`);
      
      const result = await this.filesService.uploadFile(file, data.provider , data.tenantId);
      await this.safeAck(channel, originalMsg);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`✅ Upload completado: ${file.originalname} en ${duration}ms`);
      
      return result;
      
    } catch (error) {

      await this.safeAck(channel, originalMsg);
      this.logger.error(`❌ Error en upload de ${data.file.originalname} (${fileSize})`, {
        error: error.message,
      });
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
      this.logger.debug(`🗑️ Eliminando: ${data.filename}${data.tenantId ? ` de tenant: ${data.tenantId}` : ''}`);
      
      const result = await this.filesService.deleteFile(data.filename, data.provider, data.tenantId);
      await this.safeAck(channel, originalMsg);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`✅ Archivo eliminado: ${data.filename} en ${duration}ms`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error(`❌ Error al eliminar ${data.filename}`, {
        error: error.message,
        tenantId: data.tenantId
      });
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
      this.logger.debug(`📥 Descargando: ${data.filename}${data.tenantId ? ` de tenant: ${data.tenantId}` : ''}`);
      
      const result = await this.filesService.getFile(data.filename, data.provider, data.tenantId);
      await this.safeAck(channel, originalMsg);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`✅ Archivo descargado: ${data.filename} en ${duration}ms`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error(`❌ Error al descargar ${data.filename}`, {
        error: error.message,
        tenantId: data.tenantId
      });
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
      this.logger.error(`❌ Error en ACK RabbitMQ`, {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}