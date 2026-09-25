import { DomainError } from '../../errors/DomainError.js';

/**
 * TK-160 / US-044 / ADR-009: una operación encolada que llega cuando el turno en que
 * ocurrió ya se cerró y concilió. Una conciliación firmada es un documento contable:
 * no se reabre en silencio para encajar un registro que llegó tarde.
 *
 * La operación no se pierde — queda rechazada y visible para revisión manual. HTTP 409.
 */
export class ShiftAlreadyReconciledException extends DomainError {
  constructor(shiftDate: Date) {
    super(
      `El turno del ${shiftDate.toISOString().slice(0, 10)} ya fue conciliado; la operación diferida no se aplica y queda para revisión manual.`,
      409
    );
  }
}
