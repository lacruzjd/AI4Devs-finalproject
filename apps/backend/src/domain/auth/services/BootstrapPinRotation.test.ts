import { describe, it, expect } from 'vitest';
import { nuncaSeRotoElPin } from './BootstrapPinRotation.js';
import { Pin } from '../value-objects/Pin.js';

/**
 * TK-164 / US-046 / EXT-002 R-02: el arranque no puede distinguir por sí solo a un
 * administrador que nunca rotó su PIN de uno que rotó. La evidencia más directa es el
 * propio PIN: si el hash almacenado todavía corresponde al de siembra, nunca se rotó.
 */
const PIN_SEMILLA = '4821';

function hashDe(pin: string): string {
  const salt = '0123456789abcdef0123456789abcdef';
  return `${salt}:${Pin.hashPin(pin, salt)}`;
}

describe('TK-164: detección de un PIN de siembra sin rotar', () => {
  it('reconoce que nunca se rotó cuando el PIN almacenado sigue siendo el de siembra', () => {
    expect(nuncaSeRotoElPin(hashDe(PIN_SEMILLA), PIN_SEMILLA)).toBe(true);
  });

  it('no molesta a quien ya rotó: el PIN almacenado es otro', () => {
    expect(nuncaSeRotoElPin(hashDe('9137'), PIN_SEMILLA)).toBe(false);
  });

  it('un hash ilegible no exige rotación ni lanza: nada puede impedir el arranque', () => {
    expect(() => nuncaSeRotoElPin('esto-no-es-un-hash', PIN_SEMILLA)).not.toThrow();
    expect(nuncaSeRotoElPin('esto-no-es-un-hash', PIN_SEMILLA)).toBe(false);
  });

  it('sin hash almacenado tampoco lanza', () => {
    expect(nuncaSeRotoElPin('', PIN_SEMILLA)).toBe(false);
  });
});
