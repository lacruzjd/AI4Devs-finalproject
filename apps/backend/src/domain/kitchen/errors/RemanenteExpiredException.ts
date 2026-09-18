import { DomainError } from '../../errors/DomainError.js';

/**
 * US-040 / TK-155: el remanente superó su fecha de vencimiento. La invariante de
 * inocuidad alimentaria (INV-5) prohíbe consumirlo: la única salida es descartarlo,
 * con su motivo. HTTP 422 — la petición es válida pero el estado del remanente la
 * hace inaceptable, mismo criterio que `ExcessConsumptionException`.
 */
export class RemanenteExpiredException extends DomainError {
  constructor(remanenteId: string) {
    super(
      `El remanente ${remanenteId} está vencido y no puede consumirse: solo puede descartarse.`,
      422
    );
  }
}
