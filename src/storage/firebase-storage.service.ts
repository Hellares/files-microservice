import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../common/interfaces/storage.interface';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { envs } from '../config/envs';
import { Readable } from 'stream';
import { formatFileSize } from 'src/common/util/format-file-size.util';

@Injectable()
export class FirebaseStorageService implements StorageService {
  private bucket: Bucket;
  private readonly logger = new Logger(FirebaseStorageService.name);
   private readonly DEFAULT_TENANT = 'admin14'; // Carpeta por defecto

  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envs.storage.firebase.projectId,
        clientEmail: envs.storage.firebase.clientEmail,
        privateKey: envs.storage.firebase.privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: envs.storage.firebase.storageBucket
    });
    this.bucket = admin.storage().bucket();
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
    const tenant = tenantId //|| this.DEFAULT_TENANT;
    
    // Crear nombre de archivo con timestamp y nombre original
    const timestampedFilename = `${Date.now()}-${file.originalname}`;
    
    // Construir la ruta completa incluyendo el tenant
    const filePath = `${tenant}/${timestampedFilename}`;
    
    this.logger.debug(`Subiendo archivo a ruta: ${filePath}`);

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

      const uploadTime = Date.now() - startTime;
      const speed = (file.size / 1024 / (uploadTime / 1000)).toFixed(2);
      
      this.logger.debug(`✅ Upload exitoso - ${formatFileSize(file.size)} en ${uploadTime}ms (${speed} KB/s) - Ruta: ${filePath}`);

      return filePath; // Devolvemos la ruta completa
    } catch (error) {
      this.logger.error(`❌ Error en upload: ${error.message}`);
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
      this.logger.debug(`✅ Archivo eliminado: ${filePath}`);
    } catch (error) {
      this.logger.error('Error al eliminar archivo:', {
        error: error.message,
        filename
      });
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
      
      this.logger.debug(`Accediendo a archivo: ${filePath}`);
      
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`El archivo ${filePath} no existe en Firebase`);
      }

      const [metadata] = await file.getMetadata();
      this.logger.debug(`📥 Accediendo a archivo:`, {
        filePath,
        size: metadata.size,
        contentType: metadata.contentType,
        cached: metadata.cacheControl ? 'yes' : 'no'
      });

      const [fileContent] = await file.download({
        validation: false
      });
      return fileContent;
    } catch (error) {
      this.logger.error('Error al obtener archivo:', {
        error: error.message,
        filename
      });
      throw new Error(`Error al obtener archivo: ${error.message}`);
    }
  }

  private async rollback(filename: string): Promise<void> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        this.logger.debug(`♻️ Rollback: Archivo ${filename} eliminado`);
      }
    } catch (error) {
      this.logger.error(`Error en rollback: ${filename}`, error);
    }
  }
}