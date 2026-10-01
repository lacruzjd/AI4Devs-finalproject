import React from 'react';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { RemanenteFEFOItem } from '../../../kitchen/services/kitchen.service.js';
import { ModalFooterActions } from '../../../../shared/components/ModalFooterActions.js';
import { StorageSectorSelect } from '../StorageSectorSelect.js';
import { ExtractionSelectFields } from './ExtractionFields.js';
import { ExtractionFormProps, ExtractionPurpose, stockAtSector } from './types.js';
import styles from '../WarehouseExtractionModal.module.css';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: number) => void;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({ quantity, onIncrement, onDecrement, onChange }) => (
  <div>
    <label htmlFor="input-quantity-extraction" className="form-label">
      Cantidad a Extraer:
    </label>
    <div className="flex-gap-md">
      <button
        type="button"
        className={`btn-touch btn-secondary ${styles['qty-stepper-btn-lg']}`}
        onClick={onDecrement}
        id="btn-decrement-qty"
      >
        <Minus size={24} />
      </button>

      <input
        type="number"
        step="0.1"
        min="0"
        value={quantity}
        onChange={(e) => {
          // AUDIT-DEV-006 F-6: no coacciona en silencio '' / NaN a 0.5 — un valor
          // inválido pasa como 0 y la validación de submit lo rechaza explícitamente.
          const parsed = Number(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className={`input-touch ${styles['qty-stepper-input-lg']}`}
        id="input-quantity-extraction"
      />

      <button
        type="button"
        className={`btn-touch btn-secondary ${styles['qty-stepper-btn-lg']}`}
        onClick={onIncrement}
        id="btn-increment-qty"
      >
        <Plus size={24} />
      </button>
    </div>
  </div>
);

const DuplicateRemanenteWarning: React.FC<{ activeRemanentes: RemanenteFEFOItem[] }> = ({ activeRemanentes }) => {
  if (activeRemanentes.length === 0) return null;

  return (
    <div className="banner-alert banner-alert-warning" role="status">
      <AlertTriangle size={16} className={styles['inline-icon-spacer']} />
      <span>
        Atención: ya existe un remanente activo de este insumo en cocina.{' '}
        {activeRemanentes.map((r, index) => (
          <strong key={r.id}>
            {index > 0 ? ', ' : ''}
            {r.currentQuantity} {r.unitOfMeasure} en {r.location}
          </strong>
        ))}
        . Puede continuar con la extracción de todos modos.
      </span>
    </div>
  );
};

const ExtractionNoteBanner: React.FC<{ purpose: ExtractionPurpose }> = ({ purpose }) => (
  <div className={`banner-alert banner-alert-success ${styles['extraction-note-banner']}`}>
    {purpose === 'DIRECT_DISCARD' ? (
      <span><AlertTriangle size={16} className={styles['inline-icon-spacer']} /> Se registrará la <strong>merma directa desde bodega</strong> descontando el stock sin pasarlo a cocina.</span>
    ) : (
      <span><AlertTriangle size={16} className={styles['inline-icon-spacer']} /> Al confirmar la extracción, el insumo pasará al tablero de <strong>Remanentes Activos con vencimiento prioritario FEFO</strong>.</span>
    )}
  </div>
);

function originSectorHint(p: ExtractionFormProps): string | undefined {
  if (!p.selectedInsumoId || !p.fromStorageLocationId) return undefined;
  const insumo = p.insumos.find((i) => i.id === p.selectedInsumoId);
  const available = stockAtSector(insumo, p.fromStorageLocationId);
  return `Disponible en este sector: ${available.toFixed(3)} ${insumo?.unit ?? ''} (total en bodega: ${insumo?.stock ?? 0} ${insumo?.unit ?? ''})`;
}

export const ExtractionForm: React.FC<ExtractionFormProps> = (p) => (
  <form onSubmit={p.onSubmit} className="flex-column flex-gap-md">
    <StorageSectorSelect
      id="select-from-sector-extraction"
      label="Sector de Bodega Origen *"
      value={p.fromStorageLocationId}
      onChange={p.onFromStorageLocationIdChange}
      hint={originSectorHint(p)}
    />
    <ExtractionSelectFields {...p} />
    <DuplicateRemanenteWarning activeRemanentes={p.duplicateActiveRemanentes} />
    <QuantityStepper quantity={p.quantity} onIncrement={p.onIncrement} onDecrement={p.onDecrement} onChange={p.onQuantityChange} />
    <ExtractionNoteBanner purpose={p.purpose} />
    <ModalFooterActions onCancel={p.onCancel} confirmLabel="Confirmar Extracción" submittingLabel="Procesando..." isSubmitting={p.isSubmitting} />
  </form>
);
