import { ShiftReconciliation } from '../entities/ShiftReconciliation.js';

export interface IShiftReconciliationRepository {
  save(reconciliation: ShiftReconciliation): Promise<void>;
  findAll(): Promise<ShiftReconciliation[]>;
  /**
   * TK-160 / ADR-009: `true` si el turno de esa fecha ya se concilió. Una operación
   * encolada que llega después no puede reabrir un cierre firmado.
   */
  existsForShiftDate(shiftDate: Date): Promise<boolean>;
}
