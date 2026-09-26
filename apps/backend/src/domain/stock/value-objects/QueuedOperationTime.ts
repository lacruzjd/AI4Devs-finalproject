/**
 * TK-159 / US-044 / ADR-009: resuelve el momento real de una operación encolada.
 *
 * Una operación registrada sin conexión llega con la hora que marcó el dispositivo,
 * y ese reloj puede estar mal. La decisión de `ADR-009` es acotar los valores
 * imposibles y dejar constancia, nunca confiar a ciegas ni rechazar la operación
 * por un reloj desajustado: el consumo ocurrió de verdad.
 *
 * Imposible significa dos cosas, y sólo dos:
 *   - posterior al momento de recepción (el futuro no se puede haber consumido);
 *   - anterior a la existencia del remanente sobre el que se opera.
 */
export interface ResolvedOccurredAt {
  /** Momento que se persiste. `undefined` si la operación no declaró ninguno. */
  occurredAt?: Date;
  /** `true` si el servidor tuvo que acotar el valor recibido. */
  adjusted: boolean;
}

export function resolveOccurredAt(
  claimed: Date | undefined,
  receivedAt: Date,
  notBefore?: Date
): ResolvedOccurredAt {
  if (!claimed || Number.isNaN(claimed.getTime())) {
    return { adjusted: false };
  }
  if (claimed.getTime() > receivedAt.getTime()) {
    return { occurredAt: receivedAt, adjusted: true };
  }
  if (notBefore && claimed.getTime() < notBefore.getTime()) {
    return { occurredAt: notBefore, adjusted: true };
  }
  return { occurredAt: claimed, adjusted: false };
}
