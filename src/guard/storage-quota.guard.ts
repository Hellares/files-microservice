// src/guards/storage-quota.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class StorageQuotaGuard implements CanActivate {
  private readonly logger = new Logger('StorageQuotaGuard');

  constructor(
    @Inject('COMPANY_SERVICE') private readonly companyClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const data = context.switchToRpc().getData();
    
    // Manejar tanto subida individual como por lotes
    if (data.files && Array.isArray(data.files)) {
      // Caso de subida por lotes
      const { empresaId, files } = data;
      const id = empresaId;
      
      if (!id || !files || files.length === 0) {
        return true;
      }
      
      // Calcular tamaño total de todos los archivos
      const totalFileSize = files.reduce((sum, file) => {
        const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
        return sum + fileSize;
      }, 0);
      
      return await this.checkQuota(id, totalFileSize);
    } else {
      // Caso de subida individual
      const { empresaId, file } = data;
      const id = empresaId;
      
      if (!id || !file) {
        return true;
      }
      
      // Calcular tamaño del archivo
      const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
      
      return await this.checkQuota(id, fileSize);
    }
  }
  
  private async checkQuota(empresaId: string, fileSize: number): Promise<boolean> {
    try {
      // Verificar cuota con el microservicio de Company
      const quotaCheck = await firstValueFrom(
        this.companyClient.send('storage.check-quota', {
          empresaId,
          fileSize,
        }).pipe(timeout(5000))
      );

      if (!quotaCheck.hasQuota) {
        // Registrar información detallada
        this.logger.warn({
          empresa: empresaId,
          usage: quotaCheck.usage,
          limit: quotaCheck.limit,
          fileSize
        }, `Cuota excedida para empresa ${empresaId}`);
        
        // IMPORTANTE: Lanzar RpcException para detener el flujo
        throw new RpcException({
          code: 'QUOTA_EXCEEDED', 
          message: 'Cuota de almacenamiento excedida',
          details: {
            usage: quotaCheck.usage,
            limit: quotaCheck.limit,
            fileSize
          }
        });
      }

      return true;
    } catch (error) {
      // Si ya es un error RPC específico, simplemente propagarlo
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error({
        err: error,
        empresaId,
        fileSize
      }, `Error al verificar cuota: ${error.message}`);
      
      // En caso de error técnico, lanzamos excepción para bloquear la subida
      throw new RpcException({
        code: 'QUOTA_CHECK_ERROR',
        message: `Error al verificar cuota: ${error.message}`
      });
    }
  }
}