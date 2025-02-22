import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../common/interfaces/storage.interface';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { envs } from '../config/envs';
import { Readable } from 'stream';

@Injectable()
export class FirebaseStorageService implements StorageService {
  private bucket: Bucket;
  private readonly logger = new Logger(FirebaseStorageService.name);
  private readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;


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
 

  async upload(file: Express.Multer.File): Promise<string> {
    const startTime = Date.now();
    try {
      const filename = `${Date.now()}-${file.originalname}`;
      const fileUpload = this.bucket.file(filename);

      const metadata = {

        resumable: false,
        validation: 'md5',
        metadata: {
          contentType: file.mimetype,
          contentEncoding: 'gzip',
          cacheControl: 'public, max-age=31536000',
            metadata: {
              originalName: file.originalname,
              size: file.size,
              uploadedAt: new Date().toISOString()
            }
          }
        };

      // Crear stream y configurar pipeline
      const stream = this.bufferToStream(file.buffer);
      const uploadStream = fileUpload.createWriteStream({
        metadata,
        resumable: false,
        validation: 'md5',
        gzip: true
      });

      // Promesa para manejar el stream
      await new Promise((resolve, reject) => {
        stream
          .pipe(uploadStream)
          .on('error', (error) => {
            this.logger.error('Error en stream:', error);
            reject(error);
          })
          .on('finish', () => {
            resolve(true);
          });
      });

      const uploadTime = Date.now() - startTime;
      const uploadSpeedKBps = (file.size / 1024 / (uploadTime / 1000)).toFixed(2);

      this.logger.debug(`✅ Archivo subido a Firebase: ${filename}`, {
        timeMs: uploadTime,
        size: file.size,
        speed: `${uploadSpeedKBps} KB/s`,
        streamUpload: true
      });

      return filename;
    } catch (error) {
      const uploadTime = Date.now() - startTime;
      this.logger.error('❌ Error al subir archivo a Firebase:', {
        error: error.message,
        filename: file.originalname,
        size: file.size,
        timeMs: uploadTime
      });
      throw new Error(`Error al subir archivo a Firebase: ${error.message}`);
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      
      if (!exists) {
        this.logger.warn(`⚠️ Intento de eliminar archivo inexistente: ${filename}`);
        throw new Error(`El archivo ${filename} no existe en Firebase`);
      }

      const [metadata] = await file.getMetadata();
      await file.delete();
      
      this.logger.debug(`✅ Archivo eliminado de Firebase:`, {
        filename,
        originalName: metadata.metadata?.originalName,
        uploadedAt: metadata.metadata?.uploadedAt,
        size: metadata.size
      });
    } catch (error) {
      this.logger.error('❌ Error al eliminar archivo de Firebase:', {
        error: error.message,
        filename,
        stack: error.stack
      });
      throw new Error(`Error al eliminar archivo de Firebase: ${error.message}`);
    }
  }

  async get(filename: string): Promise<Buffer> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      
      if (!exists) {
        this.logger.warn(`⚠️ Intento de acceder a archivo inexistente: ${filename}`);
        throw new Error(`El archivo ${filename} no existe en Firebase`);
      }

      const [metadata] = await file.getMetadata();
      this.logger.debug(`📥 Accediendo a archivo:`, {
        filename,
        originalName: metadata.metadata?.originalName,
        size: metadata.size,
        contentType: metadata.contentType,
        cached: metadata.cacheControl ? 'yes' : 'no'
      });
  
      const [fileContent] = await file.download({
        validation: false
      });
      return fileContent;
    } catch (error) {
      this.logger.error('❌ Error al obtener archivo de Firebase:', {
        error: error.message,
        filename,
        stack: error.stack
      });
      throw new Error(`Error al obtener archivo de Firebase: ${error.message}`);
    }
  }

  // Método para verificar existencia de archivo
  async exists(filename: string): Promise<boolean> {
    try {
      const file = this.bucket.file(filename);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error('❌ Error al verificar existencia de archivo:', {
        error: error.message,
        filename
      });
      return false;
    }
  }

  async rollback(filename: string): Promise<void> {
    try {
      if (await this.exists(filename)) {
        await this.delete(filename);
        this.logger.debug(`♻️ Rollback: Archivo ${filename} eliminado correctamente`);
      }
    } catch (error) {
      this.logger.error(`❌ Error en rollback al eliminar ${filename}:`, {
        error: error.message,
        stack: error.stack
      });
    }
  }
}