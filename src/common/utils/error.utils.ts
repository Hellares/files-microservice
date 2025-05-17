/**
 * Funciones de utilidad para manejo de errores
 */

/**
 * Simplifica un error para logging, eliminando el stack trace
 * y otros detalles verbosos, manteniendo solo la información esencial
 */
export function simplifyError(error: any): any {
  return {
    type: error.constructor?.name || typeof error,
    message: error.message || String(error),
    code: error.code || error.statusCode || error.status
    // Sin stack trace ni otros detalles
  };
}

/**
 * Crea un mensaje de error más descriptivo para excepciones específicas
 * como las de proveedores de almacenamiento
 */
export function createErrorMessage(operation: string, resource: string, error: any): string {
  return `Error al ${operation} ${resource}: ${error.message}`;
}