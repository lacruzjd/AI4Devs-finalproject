import { Remanente } from '../../../domain/stock/entities/Remanente.js';
import { IRemanenteRepository } from '../../../domain/stock/repositories/IRemanenteRepository.js';
import { IStockUnitOfWork } from '../../../domain/stock/repositories/IStockUnitOfWork.js';
import { IConsumptionReasonRepository } from '../../../domain/kitchen/repositories/IConsumptionReasonRepository.js';
import { StockMovementRecord } from '../../../domain/stock/repositories/IRemanenteRepository.js';
import { DecimalQuantity } from '../../../domain/stock/value-objects/DecimalQuantity.js';
import { EntityNotFoundException } from '../../../domain/errors/EntityNotFoundException.js';
import { InactiveConsumptionReasonException } from '../../../domain/kitchen/errors/InactiveConsumptionReasonException.js';
import { RemanenteExpiredException } from '../../../domain/kitchen/errors/RemanenteExpiredException.js';
import { resolveOccurredAt } from '../../../domain/stock/value-objects/QueuedOperationTime.js';
import { IShiftReconciliationRepository } from '../../../domain/kitchen/repositories/IShiftReconciliationRepository.js';
import { ShiftAlreadyReconciledException } from '../../../domain/kitchen/errors/ShiftAlreadyReconciledException.js';

export interface ConsumeRemanenteDTO {
  remanenteId: string;
  quantityToConsume: number | string;
  /** ADR-004 / US-004 / TK-108: motivo estructurado obligatorio (catálogo `US-030`). */
  reasonId: string;
  /** Texto libre, siempre opcional — complementa, nunca reemplaza, el motivo estructurado. */
  notes?: string;
  /** TK-159 / ADR-009: clave de idempotencia de una operación encolada sin conexión. */
  operationId?: string;
  /** TK-159 / ADR-009: momento real en cocina. Se acota si es imposible. */
  occurredAt?: Date;
}

export interface ConsumptionResponseDTO {
  remanenteId: string;
  consumedQuantity: string;
  remainingQuantity: string;
  status: string;
  isExhausted: boolean;
}

export class ConsumeRemanenteUseCase {
  constructor(
    private readonly remanenteRepository: IRemanenteRepository & IStockUnitOfWork,
    private readonly consumptionReasonRepository: IConsumptionReasonRepository,
    /** TK-160 / ADR-009: para no reabrir un turno ya conciliado con una operación diferida. */
    private readonly reconciliationRepository?: IShiftReconciliationRepository
  ) {}

  /**
   * TK-159 / ADR-009: reintentar la sincronización de una cola es comportamiento normal,
   * no un caso raro. Si la operación ya se aplicó, se devuelve el mismo resultado en vez
   * de volver a descontar; sin esto, cada reintento duplicaría el consumo.
   */
  private async replayOf(dto: ConsumeRemanenteDTO): Promise<ConsumptionResponseDTO | null> {
    if (!dto.operationId) return null;
    const applied = await this.remanenteRepository.findMovementByOperationId(dto.operationId);
    if (!applied) return null;

    const current = await this.remanenteRepository.findRemanenteById(dto.remanenteId);
    if (!current) {
      throw new EntityNotFoundException('Remanente', dto.remanenteId);
    }
    return {
      remanenteId: current.id,
      consumedQuantity: applied.quantity,
      remainingQuantity: current.currentQuantity.toString(),
      status: current.status,
      isExhausted: current.status === 'EXHAUSTED',
    };
  }

  /**
   * TK-160 / ADR-009: un cierre de turno conciliado es un documento firmado. Una operación
   * diferida que pertenece a ese turno se rechaza y queda para revisión manual, en vez de
   * reabrirlo en silencio.
   */
  private async assertShiftOpen(deferred: boolean, shiftDate: Date): Promise<void> {
    if (!deferred || !this.reconciliationRepository) return;
    if (await this.reconciliationRepository.existsForShiftDate(shiftDate)) {
      throw new ShiftAlreadyReconciledException(shiftDate);
    }
  }

  /**
   * ADR-004: el motivo se resuelve y valida ANTES de tocar el remanente — un `reasonId`
   * inexistente o desactivado no debe dejar el consumo a medio aplicar.
   */
  private async resolveReason(reasonId: string) {
    const reason = await this.consumptionReasonRepository.findById(reasonId);
    if (!reason) {
      throw new EntityNotFoundException('Motivo de consumo', reasonId);
    }
    if (!reason.isActive) {
      throw new InactiveConsumptionReasonException(reasonId);
    }
    return reason;
  }

  /**
   * TK-160 / ADR-009: la operación diferida se acepta siempre y se acota a cero; la
   * inmediata conserva el rechazo por exceso, porque ahí el operario está delante de la
   * pantalla y puede corregir el número.
   */
  private applyConsumption(
    remanente: Remanente,
    qtyToConsume: DecimalQuantity,
    deferred: boolean
  ): { applied: DecimalQuantity; excess: DecimalQuantity } {
    if (deferred) {
      return remanente.consumeDeferred(qtyToConsume);
    }
    remanente.consumeQuantity(qtyToConsume);
    return { applied: qtyToConsume, excess: new DecimalQuantity('0') };
  }

  /**
   * Deja en el ledger lo que de verdad pasó: el consumo aplicado y, si la operación
   * diferida pedía más de lo disponible, la varianza con su motivo obligatorio.
   *
   * TK-160 / ADR-009: la varianza lleva tipo propio para poder separarla en el informe
   * de cierre de la varianza de conteo físico. Ambas son pérdidas, pero por causas
   * distintas, y confundirlas haría ilegible el cierre de turno.
   */
  private async recordTrail(
    uow: { recordMovement: (movement: StockMovementRecord) => Promise<void> },
    remanente: Remanente,
    reasonId: string,
    dto: ConsumeRemanenteDTO,
    outcome: { applied: DecimalQuantity; excess: DecimalQuantity },
    occurred: { occurredAt?: Date; adjusted: boolean }
  ): Promise<void> {
    const comun = {
      insumoId: remanente.insumoId,
      fromLoc: remanente.location,
      toLoc: 'KITCHEN_SERVICE',
      reasonId,
      reason: dto.notes,
      occurredAt: occurred.occurredAt,
      occurredAtAdjusted: occurred.adjusted,
    };

    await uow.recordMovement({
      ...comun,
      id: `mov-${Date.now()}`,
      type: 'CONSUMPTION',
      quantity: outcome.applied.toString(),
      operationId: dto.operationId,
    });

    if (outcome.excess.toNumber() > 0) {
      await uow.recordMovement({
        ...comun,
        id: `mov-var-${dto.operationId}`,
        type: 'DEFERRED_SYNC_VARIANCE',
        quantity: outcome.excess.toString(),
      });
    }
  }

  public async execute(dto: ConsumeRemanenteDTO): Promise<ConsumptionResponseDTO> {
    const replay = await this.replayOf(dto);
    if (replay) return replay;

    const remanente = await this.remanenteRepository.findRemanenteById(dto.remanenteId);
    if (!remanente) {
      throw new EntityNotFoundException('Remanente', dto.remanenteId);
    }

    const now = new Date();
    const deferred = Boolean(dto.operationId);
    const occurred = resolveOccurredAt(dto.occurredAt, now, remanente.createdAt);
    const shiftDate = occurred.occurredAt ?? now;

    await this.assertShiftOpen(deferred, shiftDate);

    // US-040 / INV-5: la inocuidad manda — un remanente vencido no se consume. Para una
    // operación diferida el vencimiento se evalúa en el momento en que ocurrió: la regla
    // impide consumir producto vencido, no registrar un consumo que ya pasó antes de vencer.
    if (remanente.isExpired(deferred ? shiftDate : now)) {
      throw new RemanenteExpiredException(remanente.id);
    }

    const reason = await this.resolveReason(dto.reasonId);
    const qtyToConsume = new DecimalQuantity(dto.quantityToConsume);
    let outcome!: { applied: DecimalQuantity; excess: DecimalQuantity };

    // Persistir remanente actualizado
    // TK-168 / US-048: el remanente y sus movimientos se escriben dentro de una única
    // frontera. Antes iban sueltos: una caída entre medias descontaba el stock y perdía
    // el registro de la pérdida, justo lo que ADR-009 prometió no perder.
    await this.remanenteRepository.runRemanenteWrite(async (uow) => {
      // TK-168: la mutación del remanente ocurre DENTRO de la frontera. Aplicarla antes
      // dejaba la entidad ya modificada cuando la transacción tomaba su punto de partida,
      // de modo que revertir restauraba un estado que también estaba mal. Lo destapó el
      // test de reversión, que seguía en rojo con la frontera ya puesta.
      outcome = this.applyConsumption(remanente, qtyToConsume, deferred);
      await uow.saveRemanente(remanente);
      await this.recordTrail(uow, remanente, reason.id, dto, outcome, occurred);
    });

    return {
      remanenteId: remanente.id,
      consumedQuantity: outcome.applied.toString(),
      remainingQuantity: remanente.currentQuantity.toString(),
      status: remanente.status,
      isExhausted: remanente.status === 'EXHAUSTED',
    };
  }
}
