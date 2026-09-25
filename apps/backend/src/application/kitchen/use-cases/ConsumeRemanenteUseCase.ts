import { IRemanenteRepository } from '../../../domain/stock/repositories/IRemanenteRepository.js';
import { IConsumptionReasonRepository } from '../../../domain/kitchen/repositories/IConsumptionReasonRepository.js';
import { DecimalQuantity } from '../../../domain/stock/value-objects/DecimalQuantity.js';
import { EntityNotFoundException } from '../../../domain/errors/EntityNotFoundException.js';
import { InactiveConsumptionReasonException } from '../../../domain/kitchen/errors/InactiveConsumptionReasonException.js';
import { RemanenteExpiredException } from '../../../domain/kitchen/errors/RemanenteExpiredException.js';
import { resolveOccurredAt } from '../../../domain/stock/value-objects/QueuedOperationTime.js';

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
    private readonly remanenteRepository: IRemanenteRepository,
    private readonly consumptionReasonRepository: IConsumptionReasonRepository
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

  public async execute(dto: ConsumeRemanenteDTO): Promise<ConsumptionResponseDTO> {
    const replay = await this.replayOf(dto);
    if (replay) return replay;

    const remanente = await this.remanenteRepository.findRemanenteById(dto.remanenteId);
    if (!remanente) {
      throw new EntityNotFoundException('Remanente', dto.remanenteId);
    }

    // US-040 / INV-5: la inocuidad manda sobre el resto de validaciones — un remanente
    // vencido no se consume ni aunque el motivo sea válido. Solo se puede descartar.
    const now = new Date();
    if (remanente.isExpired(now)) {
      throw new RemanenteExpiredException(remanente.id);
    }

    // ADR-004: el motivo se resuelve y valida ANTES de tocar el remanente — un
    // reasonId inexistente o desactivado no debe dejar el consumo a medio aplicar.
    const reason = await this.consumptionReasonRepository.findById(dto.reasonId);
    if (!reason) {
      throw new EntityNotFoundException('Motivo de consumo', dto.reasonId);
    }
    if (!reason.isActive) {
      throw new InactiveConsumptionReasonException(dto.reasonId);
    }

    // TK-159 / ADR-009: el reloj del dispositivo puede estar mal. Se acota, no se confía.
    const occurred = resolveOccurredAt(dto.occurredAt, now, remanente.createdAt);

    const qtyToConsume = new DecimalQuantity(dto.quantityToConsume);

    // Ejecutar consumo en dominio (valida exceso y cambia a EXHAUSTED si queda 0)
    remanente.consumeQuantity(qtyToConsume);

    // Persistir remanente actualizado
    await this.remanenteRepository.saveRemanente(remanente);

    // Registrar auditoria de consumo — reasonId (motivo estructurado) + reason (texto libre)
    await this.remanenteRepository.recordMovement({
      id: `mov-${Date.now()}`,
      insumoId: remanente.insumoId,
      type: 'CONSUMPTION',
      quantity: qtyToConsume.toString(),
      fromLoc: remanente.location,
      toLoc: 'KITCHEN_SERVICE',
      reasonId: reason.id,
      reason: dto.notes,
      operationId: dto.operationId,
      occurredAt: occurred.occurredAt,
      occurredAtAdjusted: occurred.adjusted,
    });

    return {
      remanenteId: remanente.id,
      consumedQuantity: qtyToConsume.toString(),
      remainingQuantity: remanente.currentQuantity.toString(),
      status: remanente.status,
      isExhausted: remanente.status === 'EXHAUSTED',
    };
  }
}
