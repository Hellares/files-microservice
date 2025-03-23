// import { Injectable } from '@nestjs/common';
// import { PinoLogger } from 'nestjs-pino';
// import { v2 as cloudinary } from 'cloudinary';
// import { StorageService } from '../common/interfaces/storage.interface';
// import { envs } from '../config/envs';
// import { Buffer } from 'buffer';

// @Injectable()
// export class CloudinaryStorageService implements StorageService {
//   private readonly logger;
//   private readonly isDevelopment = process.env.NODE_ENV !== 'production';

//   constructor(logger: PinoLogger) {
//     this.logger = logger;
//     this.logger.setContext('CloudinaryStorage');

//     cloudinary.config({
//       cloud_name: envs.storage.cloudinary.cloudName,
//       api_key: envs.storage.cloudinary.apiKey,
//       api_secret: envs.storage.cloudinary.apiSecret
//     });
//   }

//   async upload(file: Express.Multer.File, tenantId?: string): Promise<string> {
//     try {
//       const b64 = Buffer.from(file.buffer).toString('base64');
//       const dataURI = `data:${file.mimetype};base64,${b64}`;
      
//       const result = await cloudinary.uploader.upload(dataURI, {
//         resource_type: 'auto',
//         folder: tenantId || undefined
//       });
  
//       if (this.isDevelopment) {
//         this.logger.info({
//           secureUrl: result.secure_url,
//           publicId: result.public_id,
//           originalName: file.originalname
//         }, 'Archivo subido a Cloudinary');
//       }
      
//       // Extraer solo el nombre del archivo de la URL
//       // URL ejemplo: https://res.cloudinary.com/doglf2gsy/image/upload/v1741427486/y0qdcn4b7g3eagtxwxcp.webp
      
//       // Obtener la última parte de la URL (y0qdcn4b7g3eagtxwxcp.webp)
//       const urlParts = result.secure_url.split('/');
//       // const filename = urlParts[urlParts.length - 1];
//       const filename = urlParts.slice(-3).join('/');
      
//       // Registrar el nombre extraído
//       if (this.isDevelopment) {
//         this.logger.debug({ 
//           extractedFilename: filename,
//           originalUrl: result.secure_url
//         }, 'Nombre de archivo extraído');
//       }
      
//       return filename;
//     } catch (error) {
//       this.logger.error({
//         err: error,
//         fileName: file.originalname
//       }, 'Error en upload a Cloudinary');
//       throw new Error(`Error al subir archivo a Cloudinary: ${error.message}`);
//     }
//   }

//   async delete(filename: string, tenantId?: string): Promise<void> {
//     try {
//       // Para eliminar en Cloudinary, necesitamos el public_id, no la URL completa
      
//       // Primero, extraer el nombre base sin la extensión
//       const nameWithoutExt = filename.split('.')[0];
      
//       // Crear el public_id correcto
//       const publicId = tenantId 
//         ? `${tenantId}/${nameWithoutExt}`
//         : nameWithoutExt;
      
//       if (this.isDevelopment) {
//         this.logger.debug({ 
//           filename,
//           publicId
//         }, 'Intentando eliminar archivo');
//       }
      
//       const result = await cloudinary.uploader.destroy(publicId);
      
//       if (result.result !== 'ok') {
//         throw new Error(`Error al eliminar archivo de Cloudinary: ${result.result}`);
//       }

//       if (this.isDevelopment) {
//         this.logger.debug({ publicId }, 'Archivo eliminado exitosamente');
//       }
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filename
//       }, 'Error al eliminar archivo de Cloudinary');
      
//       throw new Error(`Error al eliminar archivo de Cloudinary: ${error.message}`);
//     }
//   }

//   async get(filename: string, tenantId?: string): Promise<Buffer> {
//     try {
//       // Construir la URL completa para obtener el archivo
//       const cloudName = envs.storage.cloudinary.cloudName;
      
//       // Construir la URL con el formato correcto de Cloudinary
//       const fileUrl = tenantId
//         ? `https://res.cloudinary.com/${cloudName}/image/upload/${tenantId}/${filename}`
//         : `https://res.cloudinary.com/${cloudName}/image/upload/${filename}`;
      
//       if (this.isDevelopment) {
//         this.logger.debug({ fileUrl }, 'Accediendo a archivo');
//       }
      
//       // Descargar el archivo directamente desde la URL
//       const response = await fetch(fileUrl);
      
//       if (!response.ok) {
//         throw new Error(`Error al descargar archivo de Cloudinary: ${response.statusText}`);
//       }
      
//       const arrayBuffer = await response.arrayBuffer();
//       const buffer = Buffer.from(arrayBuffer);
      
//       if (this.isDevelopment) {
//         this.logger.debug({
//           fileUrl,
//           size: buffer.length
//         }, 'Archivo descargado');
//       }
      
//       return buffer;
//     } catch (error) {
//       this.logger.error({ 
//         err: error,
//         filename
//       }, 'Error al obtener archivo de Cloudinary');
      
//       throw new Error(`Error al obtener archivo de Cloudinary: ${error.message}`);
//     }
//   }
// }

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { v2 as cloudinary } from 'cloudinary';
import { envs } from '../config/envs';
import { Buffer } from 'buffer';
import { BaseStorageService } from './base-storage.service';
import { StorageProvider } from '../common/enums/storage-provider.enum';

@Injectable()
export class CloudinaryStorageService extends BaseStorageService {
  constructor(logger: PinoLogger) {
    super(logger, 'CloudinaryStorage');

    cloudinary.config({
      cloud_name: envs.storage.cloudinary.cloudName,
      api_key: envs.storage.cloudinary.apiKey,
      api_secret: envs.storage.cloudinary.apiSecret
    });
  }

  protected async doUpload(file: Express.Multer.File, path: string): Promise<string> {
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    // Extraer el tenant del path (formato: tenant/filename)
    const folderName = path.includes('/') ? path.split('/')[0] : undefined;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      folder: folderName
    });

    if (this.isDevelopment) {
      this.logger.debug({
        secureUrl: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname
      }, 'Archivo subido a Cloudinary');
    }
    
    // Obtener la última parte de la URL
    const urlParts = result.secure_url.split('/');
    const filename = urlParts.slice(-3).join('/');
    
    return filename;
  }

  protected async doDelete(path: string): Promise<void> {
    // Extraer el nombre base sin la extensión
    const pathParts = path.split('/');
    const filenamePart = pathParts[pathParts.length - 1];
    const nameWithoutExt = filenamePart.split('.')[0];
    
    // Crear el public_id correcto con la estructura de carpetas
    let publicId = nameWithoutExt;
    if (pathParts.length > 1) {
      publicId = `${pathParts[0]}/${nameWithoutExt}`;
    }
    
    if (this.isDevelopment) {
      this.logger.debug({ 
        path,
        publicId
      }, 'Intentando eliminar archivo');
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error(`Error al eliminar archivo de Cloudinary: ${result.result}`);
    }
  }

  protected async doGet(path: string): Promise<Buffer> {
    // Construir la URL completa para obtener el archivo
    const cloudName = envs.storage.cloudinary.cloudName;
    
    // Construir la URL con el formato correcto de Cloudinary
    const fileUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${path}`;
    
    // Descargar el archivo directamente desde la URL
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Error al descargar archivo de Cloudinary: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  protected getProviderName(): string {
    return StorageProvider.CLOUDINARY;
  }
}
