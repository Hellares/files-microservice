import { Injectable, Logger } from '@nestjs/common';
import { envs } from 'src/config/envs';

export interface FileConfig {
  maxSize: number;
  allowedTypes: string[];
}

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);
  private readonly config: Record<string, FileConfig> = {
    image: {
      maxSize: envs.maxFileSize,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    document: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    },
    video: {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    }
  };

  async validateAndProcessFile(
    file: Express.Multer.File,
    type: string = 'image'
  ): Promise<{ buffer: Buffer; processedInfo: any }> {
    const startTime = performance.now();
    const config = this.config[type];

    if (!config) {
      throw new Error(`Tipo de archivo no soportado: ${type}`);
    }

    // Validación básica de tipo de archivo
    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `Tipo de archivo no permitido: ${file.mimetype}. ` +
        `Tipos permitidos: ${config.allowedTypes.join(', ')}`
      );
    }

    // Validación de tamaño
    if (file.size > config.maxSize) {
      throw new Error(
        `El archivo excede el tamaño máximo permitido de ${
          config.maxSize / (1024 * 1024)
        }MB`
      );
    }

    const processTime = performance.now() - startTime;

    return {
      buffer: file.buffer,
      processedInfo: {
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        type: type,
        processTime: `${Math.round(processTime)}ms`
      }
    };
  }
}