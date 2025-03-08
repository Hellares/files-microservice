import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { FilesService } from './files.service';
import { formatFileSize } from 'src/common/util/format-file-size.util';
import { PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';



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
      // Asegurarnos de que el buffer sea realmente un Buffer
      // RabbitMQ serializa y deserializa el buffer como un objeto
      const file = {
        ...data.file,
        buffer: this.ensureBuffer(data.file.buffer)
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
      
      const result = await this.filesService.uploadFile(file, data.provider, data.tenantId);
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

  /**
   * Nuevo endpoint optimizado para archivos grandes
   * Recibe el buffer como base64 para reducir el tamaño del mensaje
   */
  @MessagePattern('file.upload.optimized')
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
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  const startTime = Date.now();
  const fileSize = formatFileSize(data.file.size);

  try {
    // Creamos el buffer a partir del base64
    const buffer = Buffer.from(data.file.bufferBase64, 'base64');
    
    // Crear un stream desde el buffer para satisfacer la interfaz de Multer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // Señalizar fin del stream
    
    // Reconstruir el objeto file con un buffer real y stream a partir del base64
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: data.file.originalname,
      encoding: '7bit',
      mimetype: data.file.mimetype,
      size: data.file.size,
      buffer,
      stream, // Añadimos el stream requerido
      destination: '',
      filename: '',
      path: ''
    };
    
    // Log debug solo en desarrollo
    if (this.isDevelopment) {
      this.logger.info({ 
        fileName: file.originalname, 
        fileSize, 
        provider: data.provider || 'default',
        tenantId: data.tenantId
      }, 'Iniciando upload (optimizado)');
    }
    
    const result = await this.filesService.uploadFile(file, data.provider, data.tenantId);
    await this.safeAck(channel, originalMsg);
    
    if (this.isDevelopment) {
      const duration = Date.now() - startTime;
      this.logger.info({ 
        fileName: file.originalname, 
        duration: `${duration}ms`, 
        fileSize,
        provider: data.provider || 'default',
        tenantId: data.tenantId
      }, 'Upload completado (optimizado)');
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
    }, 'Error en upload (optimizado)');

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
      tenantId?: string;
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
      tenantId?: string;
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

  /**
   * Asegura que el valor proporcionado sea un Buffer
   * Al pasar por RabbitMQ, los buffers se serializan como objetos {type: 'Buffer', data: [...]}
   */
  private ensureBuffer(possibleBuffer: any): Buffer {
    // Si ya es un Buffer, lo devolvemos directamente
    if (Buffer.isBuffer(possibleBuffer)) {
      return possibleBuffer;
    }
    
    // Si es un objeto con propiedad 'data' y es un array, usamos esos datos
    if (possibleBuffer && possibleBuffer.type === 'Buffer' && Array.isArray(possibleBuffer.data)) {
      return Buffer.from(possibleBuffer.data);
    }
    
    // Intento general (podría lanzar error si no es convertible a Buffer)
    return Buffer.from(possibleBuffer);
  }
}