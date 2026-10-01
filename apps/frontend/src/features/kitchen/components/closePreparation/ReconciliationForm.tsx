import React from 'react';
import { RecipePreparationDetail } from '../../services/recipePreparations.service.js';
import { StorageLocationDto } from '../../../stock/services/locations.service.js';
import { ModalFooterActions } from '../../../../shared/components/ModalFooterActions.js';
import { ErrorBanner } from '../../../../shared/components/ErrorBanner.js';
import { initialRow } from './closeRules.js';
import { CloseForm } from './useClosePreparation.js';
import { PreparationItemRow } from './PreparationItemRow.js';
import styles from '../ClosePreparationModal.module.css';

const ActualPortionsField: React.FC<{ value: number; onChange: (n: number) => void; plannedPortions: number }> = ({
  value,
  onChange,
  plannedPortions,
}) => (
  <div className="mb-4">
    <label htmlFor="input-actual-portions" className="form-label">
      Porciones reales obtenidas (planificadas: {plannedPortions}):
    </label>
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0);
      }}
      className="input-touch"
      id="input-actual-portions"
    />
  </div>
);

interface ReconciliationFormProps {
  detail: RecipePreparationDetail;
  form: CloseForm;
  kitchenAreas: StorageLocationDto[];
  warehouseAreas: StorageLocationDto[];
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ReconciliationForm: React.FC<ReconciliationFormProps> = ({
  detail,
  form,
  kitchenAreas,
  warehouseAreas,
  submitError,
  isSubmitting,
  onSubmit,
  onCancel,
}) => (
  <form onSubmit={onSubmit} className="flex-column">
    {submitError && <ErrorBanner message={submitError} />}
    <ActualPortionsField value={form.actualPortions} onChange={form.setActualPortions} plannedPortions={detail.plannedPortions} />
    <div className={`flex-column flex-gap-md mb-4 ${styles['list-scroll']}`}>
      {detail.remanentes.map((r) => (
        <PreparationItemRow
          key={r.id}
          remanente={r}
          row={form.rows[r.id] ?? initialRow(r)}
          kitchenAreas={kitchenAreas}
          warehouseAreas={warehouseAreas}
          onChange={(patch) => form.updateRow(r.id, patch)}
        />
      ))}
    </div>
    <ModalFooterActions onCancel={onCancel} confirmLabel="Cerrar Preparación" submittingLabel="Cerrando..." isSubmitting={isSubmitting} />
  </form>
);
