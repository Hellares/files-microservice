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
 * Decorador para manejar errores en métodos del controlador RMQ
 * Gestiona automáticamente el ACK y el logging de errores
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
        // Hacer ACK de todos modos para no bloquear la cola
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