import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { StorageService } from '../common/interfaces/storage.interface';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { envs } from '../config/envs';
import { Readable } from 'stream';
import { formatFileSize } from 'src/common/util/format-file-size.util';

@Injectable()
export class FirebaseStorageService implements StorageService {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';
  private bucket: Bucket;
  private readonly DEFAULT_TENANT = 'admin'; // Carpeta por defecto

  constructor(
    private readonly logger: PinoLogger
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envs.storage.firebase.projectId,
        clientEmail: envs.storage.firebase.clientEmail,
        privateKey: envs.storage.firebase.privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: envs.storage.firebase.storageBucket
    });
    this.bucket = admin.storage().bucket();
    this.logger.setContext('firebaseStorage');
  }

  private bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  
  async upload(file: Express.Multer.File, tenantId?: string): Promise<string> {
    const startTime = Date.now();
    
    // Usar el tenant proporcionado o el predeterminado
    const tenant = tenantId || this.DEFAULT_TENANT;
    
    // Crear nombre de archivo con timestamp y nombre original
    const timestampedFilename = `${Date.now()}-${file.originalname}`;
    
    // Construir la ruta completa incluyendo el tenant
    const filePath = `${tenant}/${timestampedFilename}`;
    
    
    try {
      if (file.size > envs.maxFileSize) {
        throw new Error(`Archivo excede el tamaño máximo permitido de ${formatFileSize(envs.maxFileSize)}`);
      }

      const fileUpload = this.bucket.file(filePath);
      const metadata = {
        contentType: file.mimetype,
        contentEncoding: 'gzip',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          originalName: file.originalname,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          tenantId: tenant // Guardar el tenant (original o predeterminado)
        }
      };

      const stream = this.bufferToStream(file.buffer);
      const uploadStream = fileUpload.createWriteStream({
        metadata,
        resumable: false,
        validation: 'md5',
        gzip: true
      });

      await new Promise((resolve, reject) => {
        stream
          .pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });     
      

      // Solo log en desarrollo, en producción no generamos logs por operaciones normales
    if (this.isDevelopment) {
      const uploadTime = Date.now() - startTime;
      const speed = (file.size / 1024 / (uploadTime / 1000)).toFixed(2);  
      this.logger.info({ 
        filePath, 
        fileSize: formatFileSize(file.size),
        uploadTime: `${uploadTime}ms`,
        speed: `${speed} KB/s`
      }, 'Upload exitoso');
    }
     
      return filePath; // Devolvemos la ruta completa
    } catch (error) {
      this.logger.error({ 
        err: error,
        filePath,
        fileName: file.originalname
      }, 'Error en upload');
      await this.rollback(filePath);
      throw error;
    }
  }

  async delete(filename: string, tenantId?: string): Promise<void> {
    try {
      // Si el filename ya incluye el path completo (contiene '/'), usarlo directamente
      let filePath = filename;
      
      // Si no incluye path y no se proporcionó tenantId, usar el predeterminado
      if (!filename.includes('/')) {
        const tenant = tenantId || this.DEFAULT_TENANT;
        filePath = `${tenant}/${filename}`;
      }
      
      this.logger.debug(`Intentando eliminar archivo: ${filePath}`);
      
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`El archivo ${filePath} no existe en Firebase`);
      }

      await file.delete();
      // Nivel de log según entorno
      if (this.isDevelopment) {
        this.logger.debug({ filePath }, 'Archivo eliminado exitosamente');
      } 
      // else {
      //   // En producción, menos verbosidad
      //   this.logger.info({ filePath }, 'Archivo eliminado');
      // }
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename,
        operation: 'delete'
      }, 'Error al eliminar archivo');
      
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  async get(filename: string, tenantId?: string): Promise<Buffer> {
    try {
      // Lógica similar a delete
      let filePath = filename;
      
      if (!filename.includes('/')) {
        const tenant = tenantId || this.DEFAULT_TENANT;
        filePath = `${tenant}/${filename}`;
      }
      
      if (this.isDevelopment) {
        this.logger.debug({ filePath }, 'Accediendo a archivo');
      }
      
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`El archivo ${filePath} no existe en Firebase`);
      }

      const [metadata] = await file.getMetadata();
      if (this.isDevelopment) {
        this.logger.debug({
          filePath,
          size: metadata.size,
          contentType: metadata.contentType,
          cached: metadata.cacheControl ? true : false,
          operation: 'download'
        }, 'Accediendo a archivo');
      }

      const [fileContent] = await file.download({
        validation: false
      });
      return fileContent;
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename,
        operation: 'get'
      }, 'Error al obtener archivo');
      
      throw new Error(`Error al obtener archivo: ${error.message}`);;
    }
  }

  private async rollback(filename: string): Promise<void> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        if (this.isDevelopment) {
          this.logger.debug({ filename }, 'Rollback completado');
        }
      }
    } catch (error) {
      this.logger.error({ 
        err: error,
        filename,
        operation: 'rollback'
      }, 'Error en rollback');
    }
  }
}