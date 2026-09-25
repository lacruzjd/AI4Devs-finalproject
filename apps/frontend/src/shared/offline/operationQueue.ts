import type { QueuedKind, QueuedOperation, QueueStorage } from './types.js';

/** Lo que el operario pide registrar; la cola completa identidad, momento y estado. */
export interface NewOperation {
  kind: QueuedKind;
  remanenteId: string;
  quantity?: string;
  reasonId?: string;
  reason?: string;
  notes?: string;
}

/**
 * Respuesta del envío. `ok` dice si el servidor la aplicó; `rejected` distingue un
 * rechazo definitivo —turno conciliado, remanente inexistente— de un fallo de red, que
 * es transitorio y debe reintentarse.
 */
export interface SendResult {
  ok: boolean;
  rejected?: boolean;
  detail?: string;
  /** Cantidad que el servidor aplicó de verdad. Si es menor que la pedida, hubo varianza. */
  consumedQuantity?: string;
}

export type Sender = (operation: QueuedOperation) => Promise<SendResult>;

/**
 * TK-160-FE / US-044 / ADR-009 — cola local de operaciones de cocina.
 *
 * Con red o sin ella se recorre el mismo camino: la operación se encola y se intenta
 * enviar. Un modo sin conexión que sólo se ejercita cuando algo falla es un modo que
 * nadie ha probado de verdad.
 *
 * La sincronización es operación a operación, no por lotes: `ADR-009` ya obliga a una
 * clave de idempotencia por operación, lo que hace seguro el reintento individual y
 * evita el caso feo del lote aplicado a medias.
 */
export class OperationQueue {
  constructor(
    private readonly storage: QueueStorage,
    private readonly send: Sender
  ) {}

  public async enqueue(operation: NewOperation): Promise<QueuedOperation> {
    const queued: QueuedOperation = {
      ...operation,
      id: nuevaClave(),
      occurredAt: new Date().toISOString(),
      status: 'pendiente',
    };
    await this.storage.add(queued);
    return queued;
  }

  public async list(): Promise<QueuedOperation[]> {
    return this.storage.list();
  }

  /**
   * Vacía lo pendiente. Un rechazo es definitivo y no se reintenta: reenviarlo sólo
   * repetiría el mismo 409. Un fallo de red deja la operación pendiente, y una que quede
   * pendiente no detiene a las siguientes.
   */
  public async sync(): Promise<QueuedOperation[]> {
    const pendientes = (await this.storage.list()).filter((o) => o.status === 'pendiente');
    const desenlaces: QueuedOperation[] = [];

    for (const operation of pendientes) {
      let result: SendResult;
      try {
        result = await this.send(operation);
      } catch {
        desenlaces.push(operation); // sin red: sigue pendiente para el próximo intento
        continue;
      }

      if (result.rejected || !result.ok) {
        await this.storage.update(operation.id, { status: 'rechazada', detail: result.detail });
        desenlaces.push({ ...operation, status: 'rechazada', detail: result.detail });
        continue;
      }

      const estado = estadoAplicado(operation, result);
      if (estado === 'aplicada') {
        // Aplicada sin incidencia: el servidor ya la tiene y nada exige la atención del
        // operario. Conservarla sólo haría crecer el almacén local sin límite.
        await this.storage.remove(operation.id);
        desenlaces.push({ ...operation, status: estado });
        continue;
      }
      await this.storage.update(operation.id, { status: estado });
      desenlaces.push({ ...operation, status: estado });
    }

    // El desenlace se devuelve porque quien encoló necesita saber cómo acabó: tras purgar
    // una aplicada limpia, buscarla en el almacén la daría por pendiente, que es falso.
    return desenlaces;
  }
}

/** Con varianza cuando el servidor aplicó menos de lo pedido (`ADR-009`). */
function estadoAplicado(operation: QueuedOperation, result: SendResult): QueuedOperation['status'] {
  if (!operation.quantity || result.consumedQuantity === undefined) return 'aplicada';
  const pedido = Number(operation.quantity);
  const aplicado = Number(result.consumedQuantity);
  return Number.isFinite(pedido) && Number.isFinite(aplicado) && aplicado < pedido
    ? 'aplicada-con-varianza'
    : 'aplicada';
}

/** Clave de idempotencia. `crypto.randomUUID` no existe en todos los navegadores en uso. */
function nuevaClave(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
