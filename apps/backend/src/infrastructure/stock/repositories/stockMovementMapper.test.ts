import { describe, it, expect } from 'vitest';
import { toMovementRow, toMovementRecord } from './stockMovementMapper.js';
import type { StockMovementRecord } from '../../../domain/stock/repositories/IRemanenteRepository.js';

/**
 * TK-169 / US-048: la traducción entre el registro de movimiento del dominio y la fila de
 * base de datos se extrae del repositorio, que mezclaba mapeo, transacciones y consultas.
 *
 * Al quedar pura se puede ejercitar sin base de datos, que es lo que nunca tuvo: hasta
 * ahora sólo se probaba de refilón, a través de casos de uso con repositorios en memoria
 * que no usan este mapeo en absoluto.
 */
const completo: StockMovementRecord = {
  id: 'mov-1',
  insumoId: 'ins-1',
  type: 'CONSUMPTION',
  quantity: '1.750',
  fromLoc: 'KITCHEN_FRIDGE',
  fromStorageLocationId: 'loc-1',
  toLoc: 'KITCHEN_SERVICE',
  operatorId: 'op-1',
  purpose: 'KITCHEN_STOCK',
  reason: 'nota libre',
  reasonId: 'reason-1',
  recipeId: 'rec-1',
  operationId: 'op-cola-1',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
  occurredAtAdjusted: true,
};

describe('TK-169: mapeo de movimientos de stock', () => {
  it('conserva la cantidad como cadena: convertirla a número perdería precisión decimal', () => {
    const row = toMovementRow(completo);
    expect(row.quantity).toBe('1.750');
    expect(typeof row.quantity).toBe('string');
  });

  it('un movimiento inmediato no marca corrección de reloj', () => {
    const row = toMovementRow({ ...completo, occurredAtAdjusted: undefined });
    expect(row.occurredAtAdjusted).toBe(false);
  });

  it('al leer, los nulos de la base se traducen a ausencia y no a null', () => {
    const record = toMovementRecord({
      id: 'mov-2',
      insumoId: 'ins-2',
      type: 'DISCARD_EXPIRATION',
      quantity: { toString: () => '0.500' },
      fromLoc: 'KITCHEN_FRIDGE',
      fromStorageLocationId: null,
      toLoc: 'WASTE_BIN',
      operatorId: null,
      purpose: null,
      reason: null,
      reasonId: null,
      recipeId: null,
      createdAt: new Date('2026-09-25T12:00:00.000Z'),
      operationId: null,
      occurredAt: null,
      occurredAtAdjusted: false,
    });

    expect(record.fromStorageLocationId).toBeUndefined();
    expect(record.operationId).toBeUndefined();
    expect(record.occurredAt).toBeUndefined();
    expect(Object.values(record)).not.toContain(null);
  });

  it('ida y vuelta: ningún campo se pierde en el viaje', () => {
    const row = toMovementRow(completo);
    const vuelta = toMovementRecord({
      ...row,
      quantity: { toString: () => row.quantity },
      createdAt: new Date('2026-09-25T12:00:00.000Z'),
      fromStorageLocationId: row.fromStorageLocationId ?? null,
      operatorId: row.operatorId ?? null,
      purpose: row.purpose ?? null,
      reason: row.reason ?? null,
      reasonId: row.reasonId ?? null,
      recipeId: row.recipeId ?? null,
      operationId: row.operationId ?? null,
      occurredAt: row.occurredAt ?? null,
    });

    expect(vuelta).toMatchObject({ ...completo });
  });
});
