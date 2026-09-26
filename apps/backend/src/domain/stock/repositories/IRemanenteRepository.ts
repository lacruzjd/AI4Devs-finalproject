import { Remanente } from '../entities/Remanente.js';

export interface StockMovementRecord {
  id: string;
  insumoId: string;
  type: string;
  quantity: string;
  fromLoc: string;
  toLoc: string;
  /** AUDIT-DEV-006 F-7 / TK-101: id del sub-sector de bodega de origen (FK). `fromLoc`
   * se conserva como snapshot de display para movimientos sin FK (históricos, cocina). */
  fromStorageLocationId?: string;
  operatorId?: string;
  purpose?: string;
  reason?: string;
  /** ADR-004: motivo estructurado del catálogo `ConsumptionReason` (`CONSUMPTION` / `SHIFT_RECONCILIATION_VARIANCE`). */
  reasonId?: string;
  recipeId?: string;
  // Opcional: Prisma lo genera solo (@default(now())); InMemoryStockRepository lo completa
  // si no viene seteado (TK-050, trazabilidad de movimientos).
  createdAt?: Date;
  /** TK-159 / ADR-009: clave de idempotencia del cliente. Sólo en operaciones encoladas. */
  operationId?: string;
  /** TK-159 / ADR-009: momento real en cocina, distinto de `createdAt` (momento de recepción). */
  occurredAt?: Date;
  /** TK-159: el servidor acotó un momento imposible y lo deja registrado. */
  occurredAtAdjusted?: boolean;
}

export interface IRemanenteRepository {
  findRemanenteById(id: string): Promise<Remanente | null>;
  findActiveRemanentesByInsumoId(insumoId: string): Promise<Remanente[]>;
  saveRemanente(remanente: Remanente): Promise<void>;
  recordMovement(movement: StockMovementRecord): Promise<void>;
  /**
   * TK-159 / ADR-009: movimiento ya aplicado con esa clave de idempotencia, si existe.
   * Reintentar la sincronización de una cola es comportamiento normal, no excepcional.
   */
  findMovementByOperationId(operationId: string): Promise<StockMovementRecord | null>;
  /**
   * US-026 / Invariante 5: `true` si existe algún `Remanente` `ACTIVE` en el área de
   * cocina indicada. Se comprueba por FK (`storageLocationId`) y, para remanentes
   * históricos sin FK, por el literal `location` == `locationName`.
   */
  existsActiveRemanenteAtLocation(storageLocationId: string, locationName: string): Promise<boolean>;
}
