import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { FilesService } from './files.service';

@Controller()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @MessagePattern('file.upload.start')
  async handleUploadStart(
    @Payload() data: { uploadId: string; totalChunks: number; metadata: any },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      this.logger.debug(`🚀 Iniciando nuevo upload por chunks: ${data.uploadId}`);
      const result = await this.filesService.handleUploadStart(data);
      await this.safeAck(channel, originalMsg);
      
      this.logger.debug(`✅ Upload iniciado: ${data.uploadId} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al iniciar upload:', {
        uploadId: data.uploadId,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw new RpcException(error.message);
    }
  }

  @MessagePattern('file.upload.chunk')
  async handleChunkUpload(
    @Payload() data: { 
      uploadId: string; 
      chunkIndex: number; 
      chunk: Buffer;
      isLast: boolean;
    },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      this.logger.debug(`📦 Recibiendo chunk ${data.chunkIndex} para upload ${data.uploadId}`);
      const result = await this.filesService.handleChunkUpload(data);
      await this.safeAck(channel, originalMsg);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `✅ Chunk ${data.chunkIndex} procesado ${data.isLast ? '(último chunk)' : ''} (${duration}ms)`
      );
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error procesando chunk:', {
        uploadId: data.uploadId,
        chunkIndex: data.chunkIndex,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw new RpcException(error.message);
    }
  }

  @MessagePattern('file.upload')
  async uploadFile(
    @Payload() data: { 
      file: Express.Multer.File, 
      provider?: string,
      type?: string
    }, 
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      const file = {
        ...data.file,
        buffer: Buffer.from(data.file.buffer)
      };
      
      this.logger.debug(`📤 Subiendo archivo: ${file.originalname} (${file.size} bytes)`);
      
      const result = await this.filesService.uploadFile(
        file, 
        data.provider,
        data.type
      );
      
      await this.safeAck(channel, originalMsg);
      
      this.logger.debug(`✅ Archivo subido: ${file.originalname} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al subir archivo:', {
        filename: data.file.originalname,
        type: data.type,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw new RpcException(error.message);
    }
  }


  @MessagePattern('file.delete')
  async deleteFile(
    @Payload() data: { filename: string; provider?: string },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      this.logger.debug(`🗑️ Eliminando archivo: ${data.filename}`);
      const result = await this.filesService.deleteFile(data.filename, data.provider);
      await this.safeAck(channel, originalMsg);
      
      this.logger.debug(`✅ Archivo eliminado: ${data.filename} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al eliminar archivo:', error);
      throw new RpcException(error.message);
    }
  }

  @MessagePattern('file.get')
  async getFile(
    @Payload() data: { filename: string; provider?: string },
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const startTime = Date.now();

    try {
      this.logger.debug(`📥 Obteniendo archivo: ${data.filename}`);
      const result = await this.filesService.getFile(data.filename, data.provider);
      await this.safeAck(channel, originalMsg);
      
      this.logger.debug(`✅ Archivo obtenido: ${data.filename} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al obtener archivo:', error);
      throw new RpcException(error.message);
    }
  }

  private async safeAck(channel: any, message: any): Promise<void> {
    try {
      if (channel?.ack && message) {
        await channel.ack(message);
        // this.logger.debug(`✅ Mensaje RabbitMQ confirmado - Operación: `);
      }
    } catch (ackError) {
      this.logger.error('❌ Error en ACK de RabbitMQ:', {
        error: ackError.message,
        stack: ackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}