import { Readable } from 'stream';

/**
 * Utilidades para manejo de buffers y streams
 * Centraliza funciones que estaban duplicadas en diferentes partes del código
 */

/**
 * Asegura que el valor proporcionado sea un Buffer
 * Al pasar por RabbitMQ, los buffers se serializan como objetos {type: 'Buffer', data: [...]}
 */
export function ensureBuffer(possibleBuffer: any): Buffer {
  // Si ya es un Buffer, lo devolvemos directamente
  if (Buffer.isBuffer(possibleBuffer)) {
    return possibleBuffer;
  }
  
  // Si es un objeto con propiedad 'data' y es un array, usamos esos datos
  if (possibleBuffer && possibleBuffer.type === 'Buffer' && Array.isArray(possibleBuffer.data)) {
    return Buffer.from(possibleBuffer.data);
  }
  
  // Intento general (podría lanzar error si no es convertible a Buffer)
  return Buffer.from(possibleBuffer);
}

/**
 * Convierte un Buffer a un Stream de manera segura
 * Verificando que realmente es un Buffer antes de intentar convertirlo
 */
export function bufferToStream(buffer: Buffer): Readable {
  // Verificar que realmente es un Buffer
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Se esperaba un Buffer para la conversión a Stream');
  }
  
  // Implementación correcta para Node.js moderno
  const stream = new Readable({
    read() {} // Método read vacío pero requerido
  });
  
  stream.push(buffer);
  stream.push(null); // Señalizar fin del stream
  
  return stream;
}

/**
 * Crea un objeto File compatible con Multer a partir de un buffer base64
 * Útil para el endpoint optimizado de subida de archivos
 */
export function createFileFromBase64(
  originalname: string,
  mimetype: string,
  size: number,
  bufferBase64: string
): Express.Multer.File {
  // Creamos el buffer a partir del base64
  const buffer = Buffer.from(bufferBase64, 'base64');
  
  // Crear un stream desde el buffer para satisfacer la interfaz de Multer
  const stream = bufferToStream(buffer);
  
  // Reconstruir el objeto file con un buffer real y stream a partir del base64
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer,
    stream,
    destination: '',
    filename: '',
    path: ''
  };
} 