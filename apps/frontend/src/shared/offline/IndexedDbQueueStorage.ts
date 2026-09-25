import type { QueuedOperation, QueueStorage } from './types.js';

/**
 * TK-160-FE / ADR-010: adaptador real del puerto de la cola sobre IndexedDB, sin librería.
 *
 * Deliberadamente delgado: toda la lógica de la cola vive en `OperationQueue`, que se
 * ejercita contra la implementación en memoria. Este archivo sólo traduce llamadas a la
 * API del navegador, y su verificación corresponde a un navegador real (workflow 09),
 * no a un test de nodo — declarado así en `ADR-010`.
 *
 * La cola debe sobrevivir al cierre de la aplicación y al reinicio del dispositivo: por eso
 * IndexedDB y no memoria ni `sessionStorage`.
 */
const DB_NAME = 'restostock-offline';
const STORE = 'operations';
const DB_VERSION = 1;

export class IndexedDbQueueStorage implements QueueStorage {
  private db?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.db;
  }

  private async run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async add(operation: QueuedOperation): Promise<void> {
    await this.run('readwrite', (store) => store.put(operation));
  }

  public async list(): Promise<QueuedOperation[]> {
    const all = await this.run<QueuedOperation[]>('readonly', (store) => store.getAll());
    return all ?? [];
  }

  public async remove(id: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(id));
  }

  public async update(id: string, changes: Partial<QueuedOperation>): Promise<void> {
    const current = await this.run<QueuedOperation | undefined>('readonly', (store) => store.get(id));
    if (!current) return;
    await this.run('readwrite', (store) => store.put({ ...current, ...changes }));
  }
}
