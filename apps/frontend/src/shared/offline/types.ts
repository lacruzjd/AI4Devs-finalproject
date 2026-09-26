/**
 * TK-160-FE / US-044 / ADR-009: una operación registrada por el operario que aún no llegó
 * al servidor, o que ya llegó y cuyo desenlace hay que poder mirar.
 */
export type QueuedKind = 'consume' | 'discard';

/**
 * Estados visibles para el operario. Una cola silenciosa traslada el problema del sistema
 * a la memoria de la persona: cada operación tiene que poder mirarse.
 */
export type QueuedStatus = 'pendiente' | 'aplicada' | 'aplicada-con-varianza' | 'rechazada';

export interface QueuedOperation {
  /** Clave de idempotencia (`operationId` del contrato). La genera el dispositivo. */
  id: string;
  kind: QueuedKind;
  remanenteId: string;
  /** Momento real en cocina. Viaja como `occurredAt`; el servidor acota lo imposible. */
  occurredAt: string;
  /** Cantidad pedida, sólo en un consumo. Sirve para detectar la varianza al responder. */
  quantity?: string;
  reasonId?: string;
  reason?: string;
  notes?: string;
  status: QueuedStatus;
  /** Motivo legible cuando el servidor la rechaza. */
  detail?: string;
}

/**
 * Puerto de almacenamiento local (ADR-010). La lógica de la cola no conoce IndexedDB:
 * así se puede ejercitar sin navegador, y cambiar el mecanismo no toca la lógica.
 */
export interface QueueStorage {
  add(operation: QueuedOperation): Promise<void>;
  list(): Promise<QueuedOperation[]>;
  update(id: string, changes: Partial<QueuedOperation>): Promise<void>;
  /** Una operación aplicada sin incidencia ya vive en el servidor: no se guarda dos veces. */
  remove(id: string): Promise<void>;
}
