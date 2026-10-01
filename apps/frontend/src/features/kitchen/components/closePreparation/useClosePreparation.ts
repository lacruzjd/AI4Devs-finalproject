import React, { useEffect, useState } from 'react';
import { RecipePreparationsService, RecipePreparationDetail } from '../../services/recipePreparations.service.js';
import { fetchActiveKitchenAreas, fetchActiveWarehouseSectors, StorageLocationDto } from '../../../stock/services/locations.service.js';
import { mapToUserFriendlyError } from '../../../../shared/utils/errorMessageMapper.js';
import { buildCloseItems, closeValidationError, EMPTY_ROW, initialRow, RowState, RowsState } from './closeRules.js';

interface DetailState {
  detail: RecipePreparationDetail | null;
  kitchenAreas: StorageLocationDto[];
  warehouseAreas: StorageLocationDto[];
  loading: boolean;
  loadError: string | null;
}

export function useClosePreparationDetail(preparationId: string | null): DetailState {
  const [state, setState] = useState<DetailState>({
    detail: null,
    kitchenAreas: [],
    warehouseAreas: [],
    loading: false,
    loadError: null,
  });

  useEffect(() => {
    if (!preparationId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, loadError: null }));
    Promise.all([RecipePreparationsService.detail(preparationId), fetchActiveKitchenAreas(), fetchActiveWarehouseSectors()])
      .then(([detail, kitchenAreas, warehouseAreas]) => {
        if (!cancelled) setState({ detail, kitchenAreas, warehouseAreas, loading: false, loadError: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, loadError: mapToUserFriendlyError(err).message }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [preparationId]);

  return state;
}

export function useCloseForm(detail: RecipePreparationDetail | null) {
  const [actualPortions, setActualPortions] = useState(0);
  const [rows, setRows] = useState<RowsState>({});

  useEffect(() => {
    if (!detail) return;
    setActualPortions(detail.plannedPortions);
    const next: RowsState = {};
    detail.remanentes.forEach((r) => {
      next[r.id] = initialRow(r);
    });
    setRows(next);
  }, [detail]);

  const updateRow = (remanenteId: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [remanenteId]: { ...(prev[remanenteId] ?? EMPTY_ROW), ...patch } }));

  return { actualPortions, setActualPortions, rows, updateRow };
}

export type CloseForm = ReturnType<typeof useCloseForm>;

export function useSubmitClose(
  preparationId: string | null,
  detail: RecipePreparationDetail | null,
  form: CloseForm,
  warehouseIds: Set<string>,
  onReconciled: () => void,
  onClose: () => void
) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !preparationId) return;
    const invalid = closeValidationError(detail.remanentes, form.rows, warehouseIds);
    if (invalid) return setSubmitError(invalid);

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await RecipePreparationsService.close(preparationId, {
        actualPortions: form.actualPortions,
        items: buildCloseItems(detail.remanentes, form.rows),
      });
      onReconciled();
      onClose();
    } catch (err) {
      console.error('[ClosePreparationModal] Error cerrando la preparación:', err);
      setSubmitError(mapToUserFriendlyError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitError, isSubmitting, handleSubmit };
}
