import { PinoLogger } from 'nestjs-pino';
import { StorageService } from '../common/interfaces/storage.interface';
import { LoggingUtils } from '../common/utils/logging.utils';
import { ValidationUtils, ALLOWED_FILE_TYPES } from '../common/utils/validation.utils';

export abstract class BaseStorageService implements StorageService {
  protected readonly logger: PinoLogger;
  protected readonly isDevelopment = process.env.NODE_ENV !== 'production';
  protected readonly DEFAULT_TENANT = 'admin'; // Carpeta por defecto

  constructor(logger: PinoLogger, contextName: string) {
    this.logger = logger;
    this.logger.setContext(contextName);
  }

  /**
   * Construye la ruta completa, incluyendo el tenant si es necesario
   */
  protected buildPath(filename: string, tenantId?: string): string {
    // Si el filename ya incluye el path completo (contiene '/'), usarlo directamente
    if (filename.includes('/')) return filename;
    
    // Si no incluye path, construir con el tenant proporcionado o el predeterminado
    const tenant = tenantId || this.DEFAULT_TENANT;
    return `${tenant}/${filename}`;
  }

  /**
   * Método abstracto para upload específico de cada proveedor
   */
  protected abstract doUpload(file: Express.Multer.File, path: string): Promise<string>;

  /**
   * Método abstracto para delete específico de cada proveedor
   */
  protected abstract doDelete(path: string): Promise<void>;

  /**
   * Método abstracto para get específico de cada proveedor
   */
  protected abstract doGet(path: string): Promise<Buffer>;

  /**
   * Implementación común de upload con manejo de errores y logging
   */
  async upload(file: Express.Multer.File, tenantId?: string): Promise<string> {
    const startTime = Date.now();
    const path = this.buildPath(file.originalname, tenantId);
    
    try {
      // Validar el archivo según su tipo MIME
      const fileType = this.detectFileType(file.mimetype);
      ValidationUtils.validateFile(file, fileType);
      
      // Log de inicio
      if (this.isDevelopment) {
        LoggingUtils.logUploadStart(
          this.logger, 
          file.originalname, 
          file.size, 
          this.getProviderName(), 
          tenantId
        );
      }
      
      // Llamar a la implementación específica
      const result = await this.doUpload(file, path);
      
      // Log de finalización
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        LoggingUtils.logUploadComplete(
          this.logger, 
          file.originalname, 
          file.size, 
          duration, 
          this.getProviderName(), 
          tenantId
        );
      }
      
      return result;
    } catch (error) {
      // Log de error
      LoggingUtils.logError(
        this.logger, 
        error, 
        file.originalname, 
        'upload', 
        this.getProviderName(), 
        tenantId
      );
      
      // Intentar hacer rollback si es necesario
      await this.rollback(path).catch(() => {
        // Ignorar errores en el rollback
      });
      
      throw error;
    }
  }

  /**
   * Implementación común de delete con manejo de errores y logging
   */
  async delete(filename: string, tenantId?: string): Promise<void> {
    const startTime = Date.now();
    const path = this.buildPath(filename, tenantId);
    
    try {
      // Log de inicio
      if (this.isDevelopment) {
        LoggingUtils.logDeleteStart(
          this.logger, 
          filename, 
          this.getProviderName(), 
          tenantId
        );
      }
      
      // Llamar a la implementación específica
      await this.doDelete(path);
      
      // Log de finalización
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        LoggingUtils.logDeleteComplete(
          this.logger, 
          filename, 
          duration, 
          this.getProviderName(), 
          tenantId
        );
      }
    } catch (error) {
      // Log de error
      LoggingUtils.logError(
        this.logger, 
        error, 
        filename, 
        'delete', 
        this.getProviderName(), 
        tenantId
      );
      
      throw error;
    }
  }

  /**
   * Implementación común de get con manejo de errores y logging
   */
  async get(filename: string, tenantId?: string): Promise<Buffer> {
    const startTime = Date.now();
    const path = this.buildPath(filename, tenantId);
    
    try {
      // Log de inicio
      if (this.isDevelopment) {
        LoggingUtils.logDownloadStart(
          this.logger, 
          filename, 
          this.getProviderName(), 
          tenantId
        );
      }
      
      // Llamar a la implementación específica
      const buffer = await this.doGet(path);
      
      // Log de finalización
      if (this.isDevelopment) {
        const duration = Date.now() - startTime;
        LoggingUtils.logDownloadComplete(
          this.logger, 
          filename, 
          buffer.length, 
          duration, 
          this.getProviderName(), 
          tenantId
        );
      }
      
      return buffer;
    } catch (error) {
      // Log de error
      LoggingUtils.logError(
        this.logger, 
        error, 
        filename, 
        'get', 
        this.getProviderName(), 
        tenantId
      );
      
      throw error;
    }
  }

  /**
   * Detecta el tipo de archivo según su MIME type
   * Esta funcionalidad estaba implícita en FileProcessorService
   */
  protected detectFileType(mimetype: string): keyof typeof ALLOWED_FILE_TYPES {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    } else {
      return 'document';
    }
  }

  /**
   * Método abstracto para obtener el nombre del proveedor
   */
  protected abstract getProviderName(): string;

  /**
   * Método para hacer rollback (se puede sobrescribir en las implementaciones)
   */
  protected async rollback(path: string): Promise<void> {
    // Implementación por defecto vacía
    // Las clases hijas pueden sobrescribirla si necesitan
  }
}