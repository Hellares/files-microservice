import { formatFileSize } from './format-file-size.util';

/**
 * Tipos de archivos permitidos por categoría
 */
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
};

/**
 * Tamaños máximos por tipo de archivo (en bytes)
 */
export const MAX_FILE_SIZES = {
  image: 20 * 1024 * 1024, // 20MB
  document: 5 * 1024 * 1024, // 5MB
  video: 100 * 1024 * 1024, // 100MB
};

/**
 * Clase de utilidad para validación de archivos
 * Centraliza las validaciones para evitar duplicación
 */
export class ValidationUtils {
  /**
   * Valida el tamaño de un archivo
   * @param size Tamaño del archivo en bytes
   * @param maxSize Tamaño máximo permitido en bytes
   * @throws Error si el archivo excede el tamaño máximo
   */
  static validateFileSize(size: number, maxSize: number): void {
    if (size > maxSize) {
      throw new Error(`Archivo excede el tamaño máximo permitido de ${formatFileSize(maxSize)}`);
    }
  }

  /**
   * Valida el tipo MIME de un archivo
   * @param mimetype Tipo MIME del archivo
   * @param allowedTypes Array de tipos MIME permitidos
   * @throws Error si el tipo de archivo no está permitido
   */
  static validateFileType(mimetype: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(mimetype)) {
      throw new Error(
        `Tipo de archivo no permitido: ${mimetype}. ` +
        `Tipos permitidos: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Valida un archivo completo (tamaño y tipo)
   * @param file Archivo a validar
   * @param fileType Tipo de archivo (image, document, video)
   * @throws Error si la validación falla
   */
  static validateFile(
    file: { size: number; mimetype: string },
    fileType: keyof typeof ALLOWED_FILE_TYPES = 'image'
  ): void {
    // Validar que el tipo de archivo sea válido
    if (!ALLOWED_FILE_TYPES[fileType]) {
      throw new Error(`Tipo de archivo no soportado: ${fileType}`);
    }

    // Validar tipo MIME
    this.validateFileType(file.mimetype, ALLOWED_FILE_TYPES[fileType]);

    // Validar tamaño
    this.validateFileSize(file.size, MAX_FILE_SIZES[fileType]);
  }

  /**
   * Genera información sobre el archivo procesado 
   * (funcionalidad migrada de FileProcessorService)
   * @param file Archivo a procesar
   * @param fileType Tipo de archivo (image, document, video)
   * @returns Información sobre el archivo procesado
   */
  static getFileInfo(
    file: Express.Multer.File,
    fileType: keyof typeof ALLOWED_FILE_TYPES = 'image'
  ): {
    originalName: string;
    size: number;
    mimetype: string;
    type: string;
    sizeFormatted: string;
  } {
    return {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      type: fileType,
      sizeFormatted: formatFileSize(file.size)
    };
  }
}