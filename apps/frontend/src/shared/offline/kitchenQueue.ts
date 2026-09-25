import { apiRequest, ApiError } from '../http/apiClient.js';
import { IndexedDbQueueStorage } from './IndexedDbQueueStorage.js';
import { InMemoryQueueStorage } from './InMemoryQueueStorage.js';
import { OperationQueue, type SendResult } from './operationQueue.js';
import type { QueuedOperation, QueueStorage } from './types.js';

/**
 * TK-160-FE / US-044: la cola de cocina ya cableada. Un único camino de código para
 * consumo y descarte: con red la operación se envía en el acto y el operario no nota
 * diferencia; sin red queda encolada y se envía al volver la conexión.
 */
function crearAlmacen(): QueueStorage {
  // Un navegador sin IndexedDB (o un entorno de pruebas) degrada a memoria: se pierde al
  // recargar, pero la aplicación sigue operando en lugar de romperse al arrancar.
  return typeof indexedDB === 'undefined' ? new InMemoryQueueStorage() : new IndexedDbQueueStorage();
}

async function enviar(operation: QueuedOperation): Promise<SendResult> {
  const ruta =
    operation.kind === 'consume'
      ? `/kitchen/remanentes/${operation.remanenteId}/consume`
      : `/kitchen/remanentes/${operation.remanenteId}/discard`;

  const body =
    operation.kind === 'consume'
      ? {
          quantity: operation.quantity,
          reasonId: operation.reasonId,
          notes: operation.notes,
          operationId: operation.id,
          occurredAt: operation.occurredAt,
        }
      : {
          reason: operation.reason,
          operationId: operation.id,
          occurredAt: operation.occurredAt,
        };

  try {
    const respuesta = await apiRequest<{ consumedQuantity?: string }>(ruta, { method: 'POST', body });
    return { ok: true, consumedQuantity: respuesta?.consumedQuantity };
  } catch (error) {
    // El servidor respondió y dijo que no: es definitivo, reintentarlo sólo repetiría el
    // mismo rechazo. Un fallo de red, en cambio, se propaga para que siga pendiente.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return { ok: false, rejected: true, detail: error.message };
    }
    throw error;
  }
}

export const kitchenQueue = new OperationQueue(crearAlmacen(), enviar);

/** Vacía lo pendiente en cuanto vuelve la red, sin que el operario tenga que hacer nada. */
export function escucharReconexion(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void kitchenQueue.sync();
  });
}
