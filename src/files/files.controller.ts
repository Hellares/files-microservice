import { Controller, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { FilesService } from './files.service';

@Controller()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @MessagePattern('file.upload')
  async uploadFile(@Payload() data: { file: Express.Multer.File, provider?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const file = {
        ...data.file,
        buffer: Buffer.from(data.file.buffer)
      };
      this.logger.debug(`📤 Subiendo archivo: ${file.originalname}`);
      const result = await this.filesService.uploadFile(file, data.provider);
      await this.safeAck(channel, originalMsg);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al subir archivo:', error);
      throw new RpcException(error.message);
    }
  }

  @MessagePattern('file.delete')
  async deleteFile(@Payload() data: { filename: string, provider?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.debug(`🗑️ Eliminando archivo: ${data.filename}`);
      const result = await this.filesService.deleteFile(data.filename, data.provider);
      await this.safeAck(channel, originalMsg);
      return result;
    } catch (error) {
      await this.safeAck(channel, originalMsg);
      this.logger.error('❌ Error al eliminar archivo:', error);
      throw new RpcException(error.message);
    }
  }

  @MessagePattern('file.get')
  async getFile(@Payload() data: { filename: string, provider?: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.debug(`📥 Obteniendo archivo: ${data.filename}`);
      const result = await this.filesService.getFile(data.filename, data.provider);
      await this.safeAck(channel, originalMsg);
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
        this.logger.debug('✅ Mensaje confirmado correctamente');
      }
    } catch (ackError) {
      this.logger.error('❌ Error en ACK:', {
        error: ackError.message,
        stack: ackError.stack
      });
    }
  }
}