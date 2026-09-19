import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { StockService, CreateInsumoDTO } from '../services/stock.service.js';
import { ErrorBanner } from '../../../shared/components/ErrorBanner.js';
import { Modal } from '../../../shared/components/Modal.js';
import { StorageSectorSelect } from './StorageSectorSelect.js';
import styles from './CreateInsumoModal.module.css';

interface CreateInsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Unit = 'KG' | 'L' | 'UNITS';

/**
 * US-043 / TK-158-FE: el mensaje vive junto a su campo, asociado con `aria-describedby`
 * y marcado con `aria-invalid` — el banner de cabecera queda solo para los errores que no
 * corresponden a ningún campo (por ejemplo, un fallo del servidor).
 */
/** US-043 / TK-158-FE: campos obligatorios y su mensaje, separados del envío. */
const FIELD_INPUT_IDS: Partial<Record<keyof FormState, string>> = {
  name: 'insumo-name-input',
  storageLocationId: 'insumo-sector-select',
};

function validateInsumoForm(state: FormState): Partial<Record<keyof FormState, string>> {
  const invalid: Partial<Record<keyof FormState, string>> = {};
  if (!state.name.trim()) invalid.name = 'El nombre del insumo es obligatorio.';
  if (!state.storageLocationId) {
    invalid.storageLocationId = 'Debe seleccionar el sub-sector de bodega donde se deposita el insumo.';
  }
  return invalid;
}

/** Mueve el foco al primer campo inválido en orden de lectura; devuelve si había alguno. */
function focusFirstInvalid(invalid: Partial<Record<keyof FormState, string>>): boolean {
  const [firstInvalid] = Object.keys(invalid) as (keyof FormState)[];
  if (!firstInvalid) return false;
  document.getElementById(FIELD_INPUT_IDS[firstInvalid] ?? '')?.focus();
  return true;
}

const TextField: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string; min?: string; maxLength?: number; required?: boolean; error?: string }> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
  min,
  maxLength,
  required,
  error,
}) => (
  <div className="mb-4">
    <label htmlFor={id} className="form-label">
      {label}
    </label>
    <input
      id={id}
      type={type}
      step={step}
      min={min}
      maxLength={maxLength}
      className="input-touch w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} role="alert" className="field-error">
        {error}
      </p>
    )}
  </div>
);

const UnitToggle: React.FC<{ value: Unit; onChange: (u: Unit) => void }> = ({ value, onChange }) => (
  <div className="mb-4">
    <span className="form-label">Unidad de Medida *</span>
    <div className="flex-gap-xs">
      {(['KG', 'L', 'UNITS'] as const).map((unit) => (
        <button
          key={unit}
          type="button"
          onClick={() => onChange(unit)}
          className={`flex-1 btn-touch ${value === unit ? styles['unit-toggle-btn--active'] : styles['unit-toggle-btn']}`}
        >
          {unit}
        </button>
      ))}
    </div>
  </div>
);

interface FormState {
  name: string;
  unitOfMeasure: Unit;
  initialWarehouseStock: string;
  storageLocationId: string;
  unitCost: string;
  barcode: string;
}

function useCreateInsumoForm(onClose: () => void, onSuccess: () => void) {
  const [state, setState] = useState<FormState>({
    name: '',
    unitOfMeasure: 'KG',
    initialWarehouseStock: '0',
    storageLocationId: '',
    unitCost: '',
    barcode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // US-043 / TK-158-FE: errores por campo; `error` queda para lo que no tiene campo.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState((s) => ({ ...s, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateInsumoForm(state);
    setFieldErrors(invalid);
    if (focusFirstInvalid(invalid)) return;

    setLoading(true);
    setError(null);
    try {
      const payload: CreateInsumoDTO = {
        name: state.name.trim(),
        unitOfMeasure: state.unitOfMeasure,
        initialWarehouseStock: state.initialWarehouseStock || '0',
        storageLocationId: state.storageLocationId,
        unitCost: state.unitCost.trim() ? state.unitCost.trim() : undefined,
        barcode: state.barcode.trim() ? state.barcode.trim() : undefined,
      };
      await StockService.createInsumo(payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error al registrar el insumo.');
    } finally {
      setLoading(false);
    }
  };

  return { state, set, loading, error, fieldErrors, submit };
}

export const CreateInsumoModal: React.FC<CreateInsumoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { state, set, loading, error, fieldErrors, submit } = useCreateInsumoForm(onClose, onSuccess);

  if (!isOpen) return null;

  return (
    <Modal size="md">
      <h2 className="flex-gap-xs mb-4 fs-lg fw-semibold">
        <Package size={20} className="text-primary-color" />
        Registrar Nuevo Insumo
      </h2>

      {error && <ErrorBanner message={error} />}

      <form noValidate onSubmit={submit}>
        <TextField id="insumo-name-input" label="Nombre del Insumo *" value={state.name} onChange={(v) => set('name', v)} placeholder="Ej. Queso Parmesano" required error={fieldErrors.name} />
        <UnitToggle value={state.unitOfMeasure} onChange={(v) => set('unitOfMeasure', v)} />
        <div className="mb-4">
          <StorageSectorSelect id="insumo-sector-select" label="Sub-sector de Bodega *" value={state.storageLocationId} onChange={(v) => set('storageLocationId', v)} />
        </div>
        <TextField
          id="initial-stock-input"
          label="Stock Inicial en ese Sub-sector"
          type="number"
          step="0.001"
          min="0"
          value={state.initialWarehouseStock}
          onChange={(v) => set('initialWarehouseStock', v)}
        />
        <TextField
          id="unit-cost-input"
          label={`Costo por ${state.unitOfMeasure} (Opcional)`}
          type="number"
          step="0.01"
          min="0"
          placeholder="Ej. 1800.00"
          value={state.unitCost}
          onChange={(v) => set('unitCost', v)}
        />
        <TextField
          id="barcode-input"
          label="Código de Barras (Opcional)"
          placeholder="Ej. 7791234567890"
          value={state.barcode}
          onChange={(v) => set('barcode', v)}
          maxLength={64}
        />
        <div className="modal-footer-actions justify-end no-margin-top">
          <button type="button" onClick={onClose} disabled={loading} className="btn-touch btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-touch btn-primary">
            {loading ? 'Guardando...' : 'Guardar Insumo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
