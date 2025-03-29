import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BaseStorageService } from './base-storage.service';
import { StorageProvider } from '../common/enums/storage-provider.enum';
import { envs } from '../config/envs';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class ElastikaStorageService extends BaseStorageService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  
  constructor(logger: PinoLogger) {
    super(logger, 'ElastikaStorage');
    
    // Cargar configuración desde variables de entorno
    this.baseUrl = envs.storage.elastika.baseUrl;
    this.apiKey = envs.storage.elastika.apiKey;
    
    this.logger.debug(
      { baseUrl: this.baseUrl },
      'ElastikaStorage inicializado'
    );
  }

  protected async doUpload(file: Express.Multer.File, path: string): Promise<string> {
    // Extraer el tenant del path (formato: tenant/filename)
    const parts = path.split('/');
    const tenant = parts[0];
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    
    // Construir la ruta final incluyendo el tenant
    const finalPath = `${tenant}/${filename}`;
    
    try {
      // Crear un nuevo FormData 
      const formData = new FormData();
      
      // Añadir el archivo al formData
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      
      const response = await axios.post(
        `${this.baseUrl}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Tenant-ID': tenant
          },
          params: {
            path: finalPath
          }
        }
      );
      
      if (response.status !== 201) {
        throw new Error(`Error al subir archivo a Elastika: ${response.statusText}`);
      }
      
      return response.data.path;
    } catch (error) {
      this.logger.error({
        err: error,
        path: finalPath,
        tenant
      }, 'Error al subir archivo a Elastika');
      throw new Error(`Error al subir archivo a Elastika: ${error.message}`);
    }
  }

  protected async doDelete(path: string): Promise<void> {
    try {
      // Método HTTP para eliminar el archivo
      await axios.delete(
        `${this.baseUrl}/files/${encodeURIComponent(path)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
    } catch (error) {
      this.logger.error({
        err: error,
        path
      }, 'Error al eliminar archivo de Elastika');
      throw new Error(`Error al eliminar archivo de Elastika: ${error.message}`);
    }
  }

  protected async doGet(path: string): Promise<Buffer> {
    try {
      // Método HTTP para obtener el archivo
      const response = await axios.get(
        `${this.baseUrl}/files/${encodeURIComponent(path)}`,
        {
          responseType: 'arraybuffer'
        }
      );
      
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error({
        err: error,
        path
      }, 'Error al obtener archivo de Elastika');
      throw new Error(`Error al obtener archivo de Elastika: ${error.message}`);
    }
  }

  protected getProviderName(): string {
    return StorageProvider.ELASTIKA;
  }
}