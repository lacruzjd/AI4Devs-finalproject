import { IShiftReconciliationRepository } from '../../../domain/kitchen/repositories/IShiftReconciliationRepository.js';
import { ShiftReconciliation } from '../../../domain/kitchen/entities/ShiftReconciliation.js';

export class InMemoryShiftReconciliationRepository implements IShiftReconciliationRepository {
  private reconciliations: ShiftReconciliation[] = [];

  public async save(reconciliation: ShiftReconciliation): Promise<void> {
    const existingIndex = this.reconciliations.findIndex((r) => r.id === reconciliation.id);
    if (existingIndex >= 0) {
      this.reconciliations[existingIndex] = reconciliation;
    } else {
      this.reconciliations.push(reconciliation);
    }
  }

  public async findAll(): Promise<ShiftReconciliation[]> {
    return [...this.reconciliations];
  }

  public async existsForShiftDate(shiftDate: Date): Promise<boolean> {
    return this.reconciliations.some((r) =>
      InMemoryShiftReconciliationRepository.sameDay(r.shiftDate, shiftDate)
    );
  }

  /** TK-160 / ADR-009: el turno es la unidad de cierre; se compara por día natural. */
  private static sameDay(a: Date, b: Date): boolean {
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  }
}
