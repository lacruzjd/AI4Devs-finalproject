import { DomainError } from '../../errors/DomainError.js';

/**
 * US-051/TK-173 (Guard 39): la unicidad del código de operario la impone el índice
 * único de PostgreSQL. Esta excepción es la traducción de dominio de esa restricción
 * — la lanza tanto la comprobación previa (camino rápido y legible) como el adaptador
 * de persistencia al recibir el `P2002` real, de modo que dos altas concurrentes con
 * el mismo código produzcan la misma respuesta que una secuencial.
 */
export class DuplicateOperatorCodeException extends DomainError {
  constructor(operatorCode: string) {
    super(`El código de operario '${operatorCode}' ya está en uso por otro miembro del personal.`, 409);
  }
}
