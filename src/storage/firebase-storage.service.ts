// import { Injectable } from '@nestjs/common';
// import { PinoLogger } from 'nestjs-pino';
// import { StorageService } from '../common/interfaces/storage.interface';
// import * as admin from 'firebase-admin';
// import { Bucket } from '@google-cloud/storage';
// import { envs } from '../config/envs';
// import { formatFileSize } from 'src/common/utils/format-file-size.util';
// import { ensureBuffer, bufferToStream } from 'src/common/utils/buffer.utils';
// import { ValidationUtils } from 'src/common/utils/validation.utils';
// import { LoggingUtils } from 'src/common/utils/logging.utils';

// @Injectable()
// export class FirebaseStorageService implements StorageService {
//   private readonly isDevelopment = process.env.NODE_ENV !== 'production';
//   private bucket: Bucket;
//   private readonly DEFAULT_TENANT = 'admin'; // Carpeta por defecto

//   constructor(
//     private readonly logger: PinoLogger
//   ) {
//     admin.initializeApp({
//       credential: admin.credential.cert({
//         projectId: envs.storage.firebase.projectId,
//         clientEmail: envs.storage.firebase.clientEmail,
//         privateKey: envs.storage.firebase.privateKey.replace(/\\n/g, '\n'),
//       }),
//       storageBucket: envs.storage.firebase.storageBucket
//     });
//     this.bucket = admin.storage().bucket();
//     this.logger.setContext('firebaseStorage');
//   }
  
//   async upload(file: Express.Multer.File, tenantId?: string): Promise<string> {
//     const startTime = Date.now();
    
//     // Usar el tenant proporcionado o el predeterminado
//     const tenant = tenantId || this.DEFAULT_TENANT;
    
//     // Crear nombre de archivo con timestamp y nombre original
//     const timestampedFilename = `${Date.now()}-${file.originalname}`;
    
//     // Construir la ruta completa incluyendo el tenant
//     const filePath = `${tenant}/${timestampedFilename}`;
    
    
//     try {
//       // Usar la validación centralizada
//       ValidationUtils.validateFileSize(file.size, envs.maxFileSize);

//       const fileUpload = this.bucket.file(filePath);
//       const metadata = {
//         contentType: file.mimetype,
//         contentEncoding: 'gzip',
//         cacheControl: 'public, max-age=31536000',
//         metadata: {
//           originalName: file.originalname,
//           size: file.size,
//           uploadedAt: new Date().toISOString(),
//           tenantId: tenant
//         }
//       };

//       // Asegurarnos de que el buffer sea realmente un Buffer usando nuestro método helper
//       const buffer = ensureBuffer(file.buffer);
//       const stream = bufferToStream(buffer);
      
//       const uploadStream = fileUpload.createWriteStream({
//         metadata,
//         resumable: false,
//         validation: 'md5',
//         gzip: true
//       });

//       await new Promise((resolve, reject) => {
//         stream
//           .pipe(uploadStream)
//           .on('error', reject)
//           .on('finish', resolve);
//       });     
      

//       // Solo log en desarrollo, en producción no generamos logs por operaciones normales
//       if (this.isDevelopment) {
//         const uploadTime = Date.now() - startTime;
//         const speed = (file.size / 1024 / (uploadTime / 1000)).toFixed(2);  
//         this.logger.info({ 
//           filePath, 
//           fileSize: formatFileSize(file.size),
//           uploadTime: `${uploadTime}ms`,
//           speed: `${speed} KB/s`
//         }, 'Upload exitoso');
//       }
     
//       return filePath; // Devolvemos la ruta completa
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filePath,
//         fileName: file.originalname
//       }, 'Error en upload');
//       await this.rollback(filePath);
//       throw error;
//     }
//   }

//   async delete(filename: string, tenantId?: string): Promise<void> {
//     try {
//       // Si el filename ya incluye el path completo (contiene '/'), usarlo directamente
//       let filePath = filename;
      
//       // Si no incluye path y no se proporcionó tenantId, usar el predeterminado
//       if (!filename.includes('/')) {
//         const tenant = tenantId || this.DEFAULT_TENANT;
//         filePath = `${tenant}/${filename}`;
//       }
      
//       this.logger.debug(`Intentando eliminar archivo: ${filePath}`);
      
//       const file = this.bucket.file(filePath);
//       const [exists] = await file.exists();
      
//       if (!exists) {
//         throw new Error(`El archivo ${filePath} no existe en Firebase`);
//       }

//       await file.delete();
//       // Nivel de log según entorno
//       if (this.isDevelopment) {
//         this.logger.debug({ filePath }, 'Archivo eliminado exitosamente');
//       } 
//       // else {
//       //   // En producción, menos verbosidad
//       //   this.logger.info({ filePath }, 'Archivo eliminado');
//       // }
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filename,
//         operation: 'delete'
//       }, 'Error al eliminar archivo');
      
//       throw new Error(`Error al eliminar archivo: ${error.message}`);
//     }
//   }

//   async get(filename: string, tenantId?: string): Promise<Buffer> {
//     try {
//       // Lógica similar a delete
//       let filePath = filename;
      
//       if (!filename.includes('/')) {
//         const tenant = tenantId || this.DEFAULT_TENANT;
//         filePath = `${tenant}/${filename}`;
//       }
      
//       if (this.isDevelopment) {
//         this.logger.debug({ filePath }, 'Accediendo a archivo');
//       }
      
//       const file = this.bucket.file(filePath);
//       const [exists] = await file.exists();
      
//       if (!exists) {
//         throw new Error(`El archivo ${filePath} no existe en Firebase`);
//       }

//       const [metadata] = await file.getMetadata();
//       if (this.isDevelopment) {
//         this.logger.debug({
//           filePath,
//           size: metadata.size,
//           contentType: metadata.contentType,
//           cached: metadata.cacheControl ? true : false,
//           operation: 'download'
//         }, 'Accediendo a archivo');
//       }

//       const [fileContent] = await file.download({
//         validation: false
//       });
//       return fileContent;
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filename,
//         operation: 'get'
//       }, 'Error al obtener archivo');
      
//       throw new Error(`Error al obtener archivo: ${error.message}`);
//     }
//   }

//   private async rollback(filename: string): Promise<void> {
//     try {
//       const file = this.bucket.file(filename);
//       const [exists] = await file.exists();
//       if (exists) {
//         await file.delete();
//         if (this.isDevelopment) {
//           this.logger.debug({ filename }, 'Rollback completado');
//         }
//       }
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filename,
//         operation: 'rollback'
//       }, 'Error en rollback');
//     }
//   }
// }

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { envs } from '../config/envs';
import { BaseStorageService } from './base-storage.service';
import { StorageProvider } from '../common/enums/storage-provider.enum';
import { ensureBuffer, bufferToStream } from 'src/common/utils/buffer.utils';
import { formatFileSize } from 'src/common/utils/format-file-size.util';

@Injectable()
export class FirebaseStorageService extends BaseStorageService {
  private bucket: Bucket;

  constructor(logger: PinoLogger) {
    super(logger, 'FirebaseStorage');
    
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
  
  protected async doUpload(file: Express.Multer.File, path: string): Promise<string> {
    const startTime = Date.now();
    
    // Crear nombre de archivo con timestamp y nombre original
    const timestampedFilename = `${Date.now()}-${file.originalname}`;
    
    // Extraer el tenant del path
    const parts = path.split('/');
    const tenant = parts[0];
    
    // Construir la ruta completa incluyendo el tenant
    const filePath = `${tenant}/${timestampedFilename}`;
    
    const fileUpload = this.bucket.file(filePath);
    const metadata = {
      contentType: file.mimetype,
      contentEncoding: 'gzip',
      cacheControl: 'public, max-age=31536000',
      metadata: {
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        tenantId: tenant
      }
    };

    // Asegurarnos de que el buffer sea realmente un Buffer
    const buffer = ensureBuffer(file.buffer);
    const stream = bufferToStream(buffer);
    
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
    

    // Solo log en desarrollo
    if (this.isDevelopment) {
      const uploadTime = Date.now() - startTime;
      const speed = (file.size / 1024 / (uploadTime / 1000)).toFixed(2);  
      this.logger.debug({ 
        filePath, 
        fileSize: formatFileSize(file.size),
        uploadTime: `${uploadTime}ms`,
        speed: `${speed} KB/s`
      }, 'Upload exitoso');
    }
   
    return filePath;
  }

  protected async doDelete(path: string): Promise<void> {
    const file = this.bucket.file(path);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error(`El archivo ${path} no existe en Firebase`);
    }

    await file.delete();
  }

  protected async doGet(path: string): Promise<Buffer> {
    const file = this.bucket.file(path);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error(`El archivo ${path} no existe en Firebase`);
    }

    const [metadata] = await file.getMetadata();
    if (this.isDevelopment) {
      this.logger.debug({
        path,
        size: metadata.size,
        contentType: metadata.contentType,
        cached: metadata.cacheControl ? true : false
      }, 'Accediendo a archivo');
    }

    const [fileContent] = await file.download({
      validation: false
    });
    
    return fileContent;
  }

  protected async rollback(path: string): Promise<void> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        if (this.isDevelopment) {
          this.logger.debug({ path }, 'Rollback completado');
        }
      }
    } catch (error) {
      this.logger.error({ 
        err: error,
        path,
        operation: 'rollback'
      }, 'Error en rollback');
    }
  }

  protected getProviderName(): string {
    return StorageProvider.FIREBASE;
  }
}