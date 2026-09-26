import { IRemanenteRepository } from '../../../domain/stock/repositories/IRemanenteRepository.js';
import { resolveOccurredAt } from '../../../domain/stock/value-objects/QueuedOperationTime.js';
import { DecimalQuantity } from '../../../domain/stock/value-objects/DecimalQuantity.js';
import { IStockUnitOfWork } from '../../../domain/stock/repositories/IStockUnitOfWork.js';
import { EntityNotFoundException } from '../../../domain/errors/EntityNotFoundException.js';
import { IdGenerator } from '../../../domain/shared/IdGenerator.js';

export interface DiscardRemanenteDTO {
  remanenteId: string;
  reason: string;
  /** TK-159 / ADR-009: clave de idempotencia de una operación encolada sin conexión. */
  operationId?: string;
  /** TK-159 / ADR-009: momento real en cocina. Se acota si es imposible. */
  occurredAt?: Date;
}

export interface DiscardResponseDTO {
  remanenteId: string;
  discardedQuantity: string;
  reason: string;
  status: string;
}

export class DiscardRemanenteUseCase {
  constructor(
    private readonly remanenteRepository: IRemanenteRepository & IStockUnitOfWork,
    private readonly idGenerator: IdGenerator
  ) {}

  public async execute(dto: DiscardRemanenteDTO): Promise<DiscardResponseDTO> {
    // TK-159 / ADR-009: un reintento de sincronización no vuelve a descartar.
    if (dto.operationId) {
      const applied = await this.remanenteRepository.findMovementByOperationId(dto.operationId);
      if (applied) {
        const current = await this.remanenteRepository.findRemanenteById(dto.remanenteId);
        if (!current) {
          throw new EntityNotFoundException('Remanente', dto.remanenteId);
        }
        return {
          remanenteId: current.id,
          discardedQuantity: applied.quantity,
          reason: dto.reason,
          status: current.status,
        };
      }
    }

    const remanente = await this.remanenteRepository.findRemanenteById(dto.remanenteId);
    if (!remanente) {
      throw new EntityNotFoundException('Remanente', dto.remanenteId);
    }

    // TK-159 / ADR-009: el reloj del dispositivo puede estar mal. Se acota, no se confía.
    const occurred = resolveOccurredAt(dto.occurredAt, new Date(), remanente.createdAt);

    // TK-168 / US-048: el descarte en el dominio y su movimiento de auditoría, dentro de
    // una única frontera. La mutación va DENTRO: aplicarla antes dejaría la entidad ya
    // modificada cuando la transacción toma su punto de partida, y revertir restauraría
    // un estado igualmente incorrecto.
    let discardedQty!: DecimalQuantity;
    await this.remanenteRepository.runRemanenteWrite(async (uow) => {
      discardedQty = remanente.discard();
      await uow.saveRemanente(remanente);

      // El identificador del movimiento lo genera un servicio inyectado y no `Date.now()`:
      // mismo riesgo de colisión de clave primaria que AUDIT-DEV-006 F-3 corrigió en otros
      // casos de uso y que este no cubrió en su momento.
      await uow.recordMovement({
        id: this.idGenerator.next('mov-discard'),
        operationId: dto.operationId,
        occurredAt: occurred.occurredAt,
        occurredAtAdjusted: occurred.adjusted,
        insumoId: remanente.insumoId,
        type: `DISCARD_${dto.reason}`,
        quantity: discardedQty.toString(),
        fromLoc: remanente.location,
        toLoc: 'WASTE_BIN',
      });
    });

    return {
      remanenteId: remanente.id,
      discardedQuantity: discardedQty.toString(),
      reason: dto.reason,
      status: remanente.status,
    };
  }
}
