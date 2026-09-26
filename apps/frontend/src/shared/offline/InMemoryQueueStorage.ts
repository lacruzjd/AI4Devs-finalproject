import type { QueuedOperation, QueueStorage } from './types.js';

/** ADR-010: implementación en memoria del puerto, para ejercitar la cola sin navegador. */
export class InMemoryQueueStorage implements QueueStorage {
  private operations: QueuedOperation[] = [];

  public async add(operation: QueuedOperation): Promise<void> {
    this.operations.push({ ...operation });
  }

  public async list(): Promise<QueuedOperation[]> {
    return this.operations.map((o) => ({ ...o }));
  }

  public async remove(id: string): Promise<void> {
    this.operations = this.operations.filter((o) => o.id !== id);
  }

  public async update(id: string, changes: Partial<QueuedOperation>): Promise<void> {
    const index = this.operations.findIndex((o) => o.id === id);
    if (index >= 0) {
      this.operations[index] = { ...this.operations[index], ...changes };
    }
  }
}
