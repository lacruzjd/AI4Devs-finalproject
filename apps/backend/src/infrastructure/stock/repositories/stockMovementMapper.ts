import type { StockMovementRecord } from '../../../domain/stock/repositories/IRemanenteRepository.js';

/**
 * TK-169 / US-048 — traducción entre el registro de movimiento del dominio y su fila en
 * base de datos.
 *
 * Vivía dentro del repositorio de stock, mezclada con la gestión de transacciones y las
 * consultas. Son responsabilidades distintas: esto cambia cuando cambia la **forma** del
 * movimiento persistido, no cuando cambia cómo se agrupan las escrituras o cómo se buscan.
 *
 * Al quedar puro, se puede ejercitar sin base de datos.
 */

/** Forma de la fila tal como la devuelve el ORM: nulos donde el dominio usa ausencia. */
export interface StockMovementRow {
  id: string;
  insumoId: string;
  type: string;
  quantity: { toString(): string };
  fromLoc: string;
  fromStorageLocationId: string | null;
  toLoc: string;
  operatorId: string | null;
  purpose: string | null;
  reason: string | null;
  reasonId: string | null;
  recipeId: string | null;
  createdAt: Date;
  operationId: string | null;
  occurredAt: Date | null;
  occurredAtAdjusted: boolean;
}

/**
 * La cantidad viaja como **cadena** en todo el camino. Convertirla a número aquí perdería
 * la precisión decimal que el proyecto declara innegociable para cantidades físicas.
 */
export function toMovementRow(movement: StockMovementRecord) {
  return {
    id: movement.id,
    insumoId: movement.insumoId,
    type: movement.type,
    quantity: movement.quantity,
    fromLoc: movement.fromLoc,
    fromStorageLocationId: movement.fromStorageLocationId,
    toLoc: movement.toLoc,
    operatorId: movement.operatorId,
    purpose: movement.purpose,
    reason: movement.reason,
    reasonId: movement.reasonId,
    recipeId: movement.recipeId,
    // TK-159 / ADR-009: cola sin conexión. `operationId` lleva índice único en la base de
    // datos, no una comprobación previa en código: el reintento de una sincronización es
    // concurrente por naturaleza y una comprobación previa tiene ventana de carrera.
    operationId: movement.operationId,
    occurredAt: movement.occurredAt,
    occurredAtAdjusted: movement.occurredAtAdjusted ?? false,
  };
}

/** Los nulos de la base se traducen a ausencia: el dominio no distingue null de no dado. */
export function toMovementRecord(row: StockMovementRow): StockMovementRecord {
  return {
    id: row.id,
    insumoId: row.insumoId,
    type: row.type,
    quantity: row.quantity.toString(),
    fromLoc: row.fromLoc,
    fromStorageLocationId: row.fromStorageLocationId ?? undefined,
    toLoc: row.toLoc,
    operatorId: row.operatorId ?? undefined,
    purpose: row.purpose ?? undefined,
    reason: row.reason ?? undefined,
    reasonId: row.reasonId ?? undefined,
    recipeId: row.recipeId ?? undefined,
    createdAt: row.createdAt,
    operationId: row.operationId ?? undefined,
    occurredAt: row.occurredAt ?? undefined,
    occurredAtAdjusted: row.occurredAtAdjusted,
  };
}
