import { RecipePreparationLinkedRemanente, CloseItemInput } from '../../services/recipePreparations.service.js';
import { DecimalQuantity } from '../../../../shared/domain/DecimalQuantity.js';

export interface RowState {
  leftoverQty: string;
  leftoverLocationId: string;
  markedUnopened: boolean;
  wastedQty: string;
  wasteReason: string;
}

export type RowsState = Record<string, RowState>;

export const EMPTY_ROW: RowState = { leftoverQty: '0', leftoverLocationId: '', markedUnopened: false, wastedQty: '0', wasteReason: '' };

export function initialRow(remanente: RecipePreparationLinkedRemanente): RowState {
  return { ...EMPTY_ROW, leftoverLocationId: remanente.storageLocationId ?? '' };
}

/** Deriva `consumido` y si `sobrante + merma` cuadra contra lo extraído (Guard 17: Decimal, no float). */
export function computeRowBalance(extractedQty: string, leftoverQty: string, wastedQty: string) {
  const extracted = new DecimalQuantity(extractedQty || '0');
  const removed = new DecimalQuantity(leftoverQty || '0').add(wastedQty || '0');
  const balanced = !removed.isGreaterThan(extracted.toFixed(4));
  const consumedQty = balanced ? extracted.subtractClamped(removed.toFixed(4)) : new DecimalQuantity('0');
  return { consumedQty, balanced };
}

function hasPositiveLeftover(row: RowState): boolean {
  return new DecimalQuantity(row.leftoverQty || '0').isPositive();
}

function wasteReasonMissing(row: RowState): boolean {
  return new DecimalQuantity(row.wastedQty || '0').isPositive() && !row.wasteReason.trim();
}

function warehouseReturnBlocked(row: RowState, warehouseIds: Set<string>): boolean {
  return hasPositiveLeftover(row) && warehouseIds.has(row.leftoverLocationId) && !row.markedUnopened;
}

function rowError(remanente: RecipePreparationLinkedRemanente, row: RowState, warehouseIds: Set<string>): string | null {
  const { balanced } = computeRowBalance(remanente.currentQuantity, row.leftoverQty, row.wastedQty);
  if (!balanced) return `El sobrante y la merma de "${remanente.insumoName}" superan lo extraído.`;
  if (wasteReasonMissing(row)) return `Debe indicar el motivo de la merma de "${remanente.insumoName}".`;
  if (hasPositiveLeftover(row) && !row.leftoverLocationId) {
    return `Debe elegir dónde queda el sobrante de "${remanente.insumoName}".`;
  }
  if (warehouseReturnBlocked(row, warehouseIds)) {
    return `Para devolver "${remanente.insumoName}" a bodega debe marcar "envase sin abrir".`;
  }
  return null;
}

export function closeValidationError(
  remanentes: RecipePreparationLinkedRemanente[],
  rows: RowsState,
  warehouseIds: Set<string>
): string | null {
  for (const r of remanentes) {
    const error = rowError(r, rows[r.id] ?? initialRow(r), warehouseIds);
    if (error) return error;
  }
  return null;
}

export function buildCloseItems(remanentes: RecipePreparationLinkedRemanente[], rows: RowsState): CloseItemInput[] {
  return remanentes.map((r) => {
    const row = rows[r.id] ?? initialRow(r);
    const hasLeftover = hasPositiveLeftover(row);
    return {
      insumoId: r.insumoId,
      leftoverQty: row.leftoverQty || '0',
      leftoverLocationId: hasLeftover ? row.leftoverLocationId : undefined,
      markedUnopened: hasLeftover ? row.markedUnopened : undefined,
      wastedQty: row.wastedQty || '0',
      wasteReason: row.wasteReason.trim() || undefined,
    };
  });
}
