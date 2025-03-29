/**
 * Decorador para manejar errores en métodos del controlador RMQ
 * Gestiona automáticamente el ACK y el logging de errores
 */
import { RmqContext, RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';

/**
 * Función auxiliar para hacer ACK de forma segura
 * Centraliza la lógica dentro del decorador
 */
async function safeAck(logger: PinoLogger, channel: any, message: any): Promise<void> {
  try {
    if (channel?.ack && message) {
      await channel.ack(message);
    }
  } catch (error) {
    logger.error({ 
      err: error,
      operation: 'rabbitmq_ack'
    }, 'Error en ACK RabbitMQ');
  }
}

/**
 * Determina si un error está relacionado con exceso de cuota
 * @param error El error a verificar
 * @returns true si es un error de cuota excedida, false en caso contrario
 */
function isQuotaExceededError(error: any): boolean {
  // Si no es una RpcException, no es un error de cuota
  if (!(error instanceof RpcException)) {
    return false;
  }
  
  // Extraer los datos del error
  const errorData = typeof error.getError === 'function' ? 
    error.getError() : error.message;
  
  // Comprobar diferentes formatos posibles de error de cuota
  if (typeof errorData === 'object' && errorData !== null) {
    // Verificar el código del error
    if ('code' in errorData && errorData.code === 'QUOTA_EXCEEDED') {
      return true;
    }
    
    // Verificar mensaje en objetos anidados
    if ('message' in errorData && 
        typeof errorData.message === 'string' && 
        errorData.message.includes('Cuota de almacenamiento excedida')) {
      return true;
    }
  }
  
  // Verificar mensaje en formato string
  if (typeof errorData === 'string' && 
      errorData.includes('Cuota de almacenamiento excedida')) {
    return true;
  }
  
  return false;
}

/**
 * Decorador para manejar errores en métodos del controlador RMQ
 * Gestiona automáticamente el ACK y el logging de errores
 * No hace ACK en caso de errores de cuota excedida
 */
export function CatchRmqErrors() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Extraer los parámetros relevantes
      const data = args[0]; // El payload
      const context: RmqContext = args[1]; // El contexto RMQ
      const methodName = propertyKey; // Nombre del método
      
      // Acceder al logger de la instancia
      const logger: PinoLogger = this.logger;
      
      // Obtener channel y mensaje original para ACK
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      
      // Registrar tiempo de inicio
      const startTime = Date.now();
      
      try {
        // Ejecutar el método original
        const result = await originalMethod.apply(this, args);
        
        // Hacer ACK usando la función auxiliar interna
        await safeAck(logger, channel, originalMsg);
        
        // Registrar tiempo total (solo en desarrollo)
        if (process.env.NODE_ENV !== 'production') {
          const duration = Date.now() - startTime;
          logger.debug({
            method: methodName,
            duration: `${duration}ms`,
            success: true
          }, `Operacion completada: ${methodName}`);
        }
        
        return result;
      } catch (error) {
        // IMPORTANTE: Verificar si es un error de cuota excedida
        // Si lo es, NO hacer ACK para que el mensaje se mantenga en la cola
        if (isQuotaExceededError(error)) {
          // Registrar el error como una advertencia
          logger.warn({
            method: methodName,
            empresaId: data.empresaId,
            fileSize: data.file?.size || (data.files?.length ? 'multiple files' : 'unknown'),
            duration: `${Date.now() - startTime}ms`
          }, `Bloqueado por cuota excedida: ${methodName}`);
          
          // Propagar el error SIN hacer ACK
          throw error;
        }
        
        // Para otros tipos de errores, hacemos ACK para que no bloqueen la cola
        await safeAck(logger, channel, originalMsg);
        
        // Registrar el error
        logger.error({
          err: error,
          method: methodName,
          data: process.env.NODE_ENV !== 'production' ? data : undefined,
          duration: `${Date.now() - startTime}ms`
        }, `Error en ${methodName}`);
        
        // Lanzar una excepción RPC formateada
        throw new RpcException({
          message: `Error en ${methodName}: ${error.message}`,
          statusCode: error.statusCode || 500
        });
      }
    };
    
    return descriptor;
  };
}