import { describe, it, expect } from 'vitest';
import { resolveUnitOfMeasure, UNIDAD_AUSENTE } from '../features/stock/components/unitOfMeasure.js';

/**
 * TK-170-FE / US-049: la unidad sale del dato, nunca de una tabla escrita a mano.
 *
 * El respaldo anterior asociaba identificadores de insumo de demostración a unidades y
 * caía a kilogramos para todo lo demás. La unidad está garantizada por construcción, así
 * que esa tabla era código muerto; lo que no era inocuo es el respaldo silencioso, que
 * taparía un fallo de mapeo de la API en lugar de mostrarlo.
 */
const insumos = [
  { id: 'ins-1', unit: 'KG' },
  { id: 'ins-2', unit: 'L' },
  { id: 'sin-unidad', unit: undefined },
];

describe('TK-170-FE: resolución de la unidad de medida', () => {
  it('devuelve la unidad que trae el insumo', () => {
    expect(resolveUnitOfMeasure('ins-2', insumos)).toBe('L');
  });

  it('no inventa kilogramos cuando la unidad no llega: la ausencia se hace visible', () => {
    expect(resolveUnitOfMeasure('sin-unidad', insumos)).toBe(UNIDAD_AUSENTE);
    expect(resolveUnitOfMeasure('sin-unidad', insumos)).not.toBe('KG');
  });

  it('un insumo que no está en la lista tampoco se resuelve a kilogramos', () => {
    expect(resolveUnitOfMeasure('ins-desconocido', insumos)).toBe(UNIDAD_AUSENTE);
  });

  it('ningún identificador concreto decide la unidad', () => {
    // 'ins-2' y 'ins-3' eran las claves de la tabla escrita a mano: ahora sólo manda el dato.
    expect(resolveUnitOfMeasure('ins-3', [{ id: 'ins-3', unit: 'KG' }])).toBe('KG');
    expect(resolveUnitOfMeasure('ins-3', [])).toBe(UNIDAD_AUSENTE);
  });
});
