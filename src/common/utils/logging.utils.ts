import { PinoLogger } from 'nestjs-pino';
import { formatFileSize } from './format-file-size.util';

/**
 * Clase de utilidad para centralizar y optimizar el logging
 * Reduce la duplicación de logs en diferentes capas
 */
export class LoggingUtils {
  private static readonly isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Registra el inicio de una operación de subida de archivo
   */
  static logUploadStart(
    logger: PinoLogger, 
    fileName: string, 
    fileSize: number | string,
    provider: string = 'default',
    tenantId?: string,
    isOptimized: boolean = false
  ): void {
    if (!this.isDevelopment) return;

    // Convertir a string formateado si es un número
    const formattedSize = typeof fileSize === 'number' 
      ? formatFileSize(fileSize) 
      : fileSize;

    logger.info({ 
      fileName, 
      fileSize: formattedSize, 
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, `Iniciando upload${isOptimized ? ' (optimizado)' : ''}`);
  }

  /**
   * Registra la finalización de una operación de subida de archivo
   */
  static logUploadComplete(
    logger: PinoLogger, 
    fileName: string, 
    fileSize: number | string,
    duration: number | string,
    provider: string = 'default',
    tenantId?: string,
    isOptimized: boolean = false
  ): void {
    if (!this.isDevelopment) return;

    // Convertir a string formateado si es un número
    const formattedSize = typeof fileSize === 'number' 
      ? formatFileSize(fileSize) 
      : fileSize;
    
    const formattedDuration = typeof duration === 'number'
      ? `${duration}ms`
      : duration;

    logger.info({ 
      fileName, 
      duration: formattedDuration, 
      fileSize: formattedSize,
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, `Upload completado${isOptimized ? ' (optimizado)' : ''}`);
  }

  /**
   * Registra el inicio de una operación de eliminación de archivo
   */
  static logDeleteStart(
    logger: PinoLogger, 
    fileName: string,
    provider: string = 'default',
    tenantId?: string
  ): void {
    if (!this.isDevelopment) return;

    logger.debug({ 
      fileName, 
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, 'Eliminando archivo');
  }

  /**
   * Registra la finalización de una operación de eliminación de archivo
   */
  static logDeleteComplete(
    logger: PinoLogger, 
    fileName: string,
    duration: number | string,
    provider: string = 'default',
    tenantId?: string
  ): void {
    if (!this.isDevelopment) return;
    
    const formattedDuration = typeof duration === 'number'
      ? `${duration}ms`
      : duration;

    logger.debug({ 
      fileName, 
      duration: formattedDuration,
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, 'Archivo eliminado');
  }

  /**
   * Registra el inicio de una operación de descarga de archivo
   */
  static logDownloadStart(
    logger: PinoLogger, 
    fileName: string,
    provider: string = 'default',
    tenantId?: string
  ): void {
    if (!this.isDevelopment) return;

    logger.info({ 
      fileName, 
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, 'Descargando archivo');
  }

  /**
   * Registra la finalización de una operación de descarga de archivo
   */
  static logDownloadComplete(
    logger: PinoLogger, 
    fileName: string,
    fileSize: number | string,
    duration: number | string,
    provider: string = 'default',
    tenantId?: string
  ): void {
    if (!this.isDevelopment) return;
    
    // Convertir a string formateado si es un número
    const formattedSize = typeof fileSize === 'number' 
      ? formatFileSize(fileSize) 
      : fileSize;
    
    const formattedDuration = typeof duration === 'number'
      ? `${duration}ms`
      : duration;

    logger.info({ 
      fileName, 
      duration: formattedDuration,
      fileSize: formattedSize,
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName)
    }, 'Archivo descargado');
  }

  /**
   * Registra un error en una operación de archivo
   */
  static logError(
    logger: PinoLogger, 
    error: any,
    fileName: string,
    operation: string,
    provider: string = 'default',
    tenantId?: string,
    additionalInfo: Record<string, any> = {}
  ): void {
    logger.error({ 
      err: error,
      fileName,
      operation,
      provider,
      tenantId,
      traceId: this.generateTraceId(fileName),
      ...additionalInfo
    }, `Error en ${operation}`);
  }

  /**
   * Genera un ID de traza único basado en el nombre del archivo y timestamp
   * Útil para correlacionar logs de diferentes capas
   */
  private static generateTraceId(fileName: string): string {
    return `${Date.now()}-${fileName.substring(0, 10)}`;
  }
} 