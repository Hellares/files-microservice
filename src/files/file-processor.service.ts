// src/files/file-processor.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export interface FileConfig {
  maxSize: number;
  allowedTypes: string[];
  processOptions?: {
    image?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    };
    pdf?: {
      compress?: boolean;
    };
  };
}

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);
  private readonly config: Record<string, FileConfig> = {
    // Configuración base para tipos genéricos
    image: {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 80,
        },
      },
    },
    // Configuraciones específicas para cada tipo de imagen
    category: {
      maxSize: 500 * 1024, // 500KB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 800,
          maxHeight: 600,
          quality: 80,
        },
      },
    },
    portada: {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 90,
        },
      },
    },
    icon: {
      maxSize: 200 * 1024, // 200KB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 200,
          maxHeight: 200,
          quality: 85,
        },
      },
    },
    banner: {
      maxSize: 1024 * 1024, // 1MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 1920,
          maxHeight: 480,
          quality: 85,
        },
      },
    },
    thumbnail: {
      maxSize: 150 * 1024, // 150KB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      processOptions: {
        image: {
          maxWidth: 320,
          maxHeight: 240,
          quality: 75,
        },
      },
    },
    // Mantener las otras configuraciones
    video: {
      maxSize: 100 * 1024 * 1024,
      allowedTypes: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    },
    pdf: {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['application/pdf'],
      processOptions: {
        pdf: {
          compress: true,
        },
      },
    },
    document: {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    },
  };
 
  async validateAndProcessFile(
    file: Express.Multer.File,
    type: string = 'image'
  ): Promise<{ buffer: Buffer; processedInfo: any }> {
    const config = this.config[type];

    // Validaciones rápidas primero
    if (!config) {
      throw new BadRequestException(`Tipo de archivo no soportado: ${type}`);
    }

    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${config.allowedTypes.join(
          ', '
        )}`
      );
    }

    try {
      let processedResult;

      // Procesamiento según tipo de archivo
      if (file.mimetype.startsWith('image/')) {
        processedResult = await this.processImage(file.buffer, config.processOptions?.image);
      } else if (file.mimetype === 'application/pdf' && config.processOptions?.pdf?.compress) {
        const compressedBuffer = await this.compressPDF(file.buffer);
        processedResult = {
          buffer: compressedBuffer,
          info: {
            originalSize: file.size,
            processedSize: compressedBuffer.length,
            compressionRatio: ((file.size - compressedBuffer.length) / file.size * 100).toFixed(2) + '%'
          }
        };
      } else {
        processedResult = {
          buffer: file.buffer,
          info: {
            originalSize: file.size,
            processedSize: file.size,
            compressionRatio: '0%'
          }
        };
      }

      // Validación de tamaño después del procesamiento
      if (processedResult.buffer.length > config.maxSize) {
        throw new BadRequestException(
          `El archivo procesado excede el tamaño máximo permitido de ${
            config.maxSize / (1024 * 1024)
          }MB`
        );
      }

      return {
        buffer: processedResult.buffer,
        processedInfo: {
          ...processedResult.info,
          type: type
        }
      };
    } catch (error) {
      this.logger.error(`Error procesando archivo: ${error.message}`);
      throw new BadRequestException('Error al procesar el archivo');
    }
  }

  private getFileType(mimetype: string): string | null {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype === 'application/pdf') return 'pdf';
    if (
      mimetype.includes('word') ||
      mimetype.includes('excel') ||
      mimetype.includes('document') ||
      mimetype.includes('sheet')
    )
      return 'document';
    return null;
  }
  
  
  private async processImage(
    buffer: Buffer,
    options?: FileConfig['processOptions']['image']
  ): Promise<{ buffer: Buffer; info: any }> {
    try {
      const image = sharp(buffer, {
        failOnError: true,
        limitInputPixels: 50000000,
        // Optimizaciones de memoria
        sequentialRead: true,
        // Desactivar características que no usamos
        //modulate: { brightness: 1, saturation: 1, hue: 0 }
      });
  
      // Pipeline optimizado
      image
        .resize(options?.maxWidth, options?.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
          kernel: 'cubic' // más rápido que lanczos
        })
        .webp({
          quality: options?.quality || 75, // Reducir calidad para archivos más pequeños
          effort: 2, // Menor esfuerzo = más rápido
          force: true,
          //reductionEffort: 2, // Menor esfuerzo en reducción
          nearLossless: true // Mejor compresión manteniendo calidad
        });
  
      const startProcess = Date.now();
      const processedBuffer = await image.toBuffer({ resolveWithObject: true });
      const processTime = Date.now() - startProcess;
  
      const compressionRatio = ((buffer.length - processedBuffer.data.length) / buffer.length * 100).toFixed(2);
      
      this.logger.debug('Procesamiento de imagen:', {
        originalSize: buffer.length,
        processedSize: processedBuffer.data.length,
        compressionRatio: `${compressionRatio}%`,
        processTime: `${processTime}ms`,
        dimensions: `${processedBuffer.info.width}x${processedBuffer.info.height}`
      });
  
      return {
        buffer: processedBuffer.data,
        info: {
          format: 'webp',
          width: processedBuffer.info.width,
          height: processedBuffer.info.height,
          originalSize: buffer.length,
          processedSize: processedBuffer.data.length,
          compressionRatio: `${compressionRatio}%`,
          processTime
        }
      };
    } catch (error) {
      this.logger.error(`Error procesando imagen: ${error.message}`);
      throw new Error('Error al procesar la imagen');
    }
  }

  private async compressPDF(buffer: Buffer): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(buffer,{
        updateMetadata: false,
      });
      
      // Aquí podrías implementar estrategias adicionales de compresión
      const compressedPdf = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      return Buffer.from(compressedPdf);
    } catch (error) {
      this.logger.error(`Error comprimiendo PDF: ${error.message}`);
      throw new Error('Error al comprimir el PDF');
    }
  }
}