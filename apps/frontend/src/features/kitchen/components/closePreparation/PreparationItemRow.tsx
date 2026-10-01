import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { RecipePreparationLinkedRemanente } from '../../services/recipePreparations.service.js';
import { StorageLocationDto } from '../../../stock/services/locations.service.js';
import { computeRowBalance, RowState } from './closeRules.js';
import styles from '../ClosePreparationModal.module.css';

const RowExtractedInfo: React.FC<{ remanente: RecipePreparationLinkedRemanente }> = ({ remanente }) => (
  <div>
    <div className="fw-semibold fs-md">{remanente.insumoName}</div>
    <div className="fs-sm text-secondary-color">
      Extraído: {remanente.currentQuantity} · en {remanente.storageLocationName}
    </div>
  </div>
);

interface LeftoverFieldsProps {
  remanente: RecipePreparationLinkedRemanente;
  row: RowState;
  kitchenAreas: StorageLocationDto[];
  warehouseAreas: StorageLocationDto[];
  onChange: (patch: Partial<RowState>) => void;
}

const LeftoverFields: React.FC<LeftoverFieldsProps> = ({ remanente, row, kitchenAreas, warehouseAreas, onChange }) => (
  <>
    <div>
      <label htmlFor={`input-leftover-${remanente.id}`} className="form-label">
        Sobrante:
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={row.leftoverQty}
        onChange={(e) => onChange({ leftoverQty: e.target.value })}
        className="input-touch"
        id={`input-leftover-${remanente.id}`}
      />
    </div>
    <div>
      <label htmlFor={`select-leftover-dest-${remanente.id}`} className="form-label">
        ¿Dónde queda?
      </label>
      <select
        value={row.leftoverLocationId}
        onChange={(e) => onChange({ leftoverLocationId: e.target.value })}
        className="input-touch"
        id={`select-leftover-dest-${remanente.id}`}
      >
        <option value="">-- Elegir ubicación --</option>
        <optgroup label="Áreas de cocina">
          {kitchenAreas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </optgroup>
        {remanente.isPristine && warehouseAreas.length > 0 && (
          <optgroup label="Devolver a bodega (solo intacto)">
            {warehouseAreas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
    {remanente.isPristine && (
      <label className={`flex-gap-sm fs-sm ${styles['cursor-pointer']}`} htmlFor={`chk-unopened-${remanente.id}`}>
        <input
          type="checkbox"
          checked={row.markedUnopened}
          onChange={(e) => onChange({ markedUnopened: e.target.checked })}
          id={`chk-unopened-${remanente.id}`}
        />
        Envase sin abrir
      </label>
    )}
  </>
);

interface WasteFieldsProps {
  remanente: RecipePreparationLinkedRemanente;
  row: RowState;
  onChange: (patch: Partial<RowState>) => void;
}

const WasteFields: React.FC<WasteFieldsProps> = ({ remanente, row, onChange }) => (
  <>
    <div>
      <label htmlFor={`input-waste-${remanente.id}`} className="form-label">
        Merma:
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={row.wastedQty}
        onChange={(e) => onChange({ wastedQty: e.target.value })}
        className="input-touch"
        id={`input-waste-${remanente.id}`}
      />
    </div>
    <div>
      <label htmlFor={`input-waste-reason-${remanente.id}`} className="form-label">
        Motivo de la merma:
      </label>
      <input
        type="text"
        value={row.wasteReason}
        onChange={(e) => onChange({ wasteReason: e.target.value })}
        placeholder="Ej: quemado, caído al piso"
        className="input-touch"
        id={`input-waste-reason-${remanente.id}`}
      />
    </div>
  </>
);

const RowBalanceIndicator: React.FC<{ remanente: RecipePreparationLinkedRemanente; row: RowState }> = ({ remanente, row }) => {
  const { consumedQty, balanced } = computeRowBalance(remanente.currentQuantity, row.leftoverQty, row.wastedQty);
  return (
    <div className={`${styles['balance-row']} ${balanced ? styles['balance-ok'] : styles['balance-bad']}`}>
      {balanced ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      Consumido: {consumedQty.toFixed(3)} {balanced ? '· cuadra' : '· no cuadra con lo extraído'}
    </div>
  );
};

export const PreparationItemRow: React.FC<LeftoverFieldsProps> = ({ remanente, row, kitchenAreas, warehouseAreas, onChange }) => {
  const { balanced } = computeRowBalance(remanente.currentQuantity, row.leftoverQty, row.wastedQty);
  return (
    <div className={`reconciliation-item-row${balanced ? '' : ` ${styles['item-row--unbalanced']}`}`}>
      <RowExtractedInfo remanente={remanente} />
      <div className={styles['field-grid']}>
        <LeftoverFields remanente={remanente} row={row} kitchenAreas={kitchenAreas} warehouseAreas={warehouseAreas} onChange={onChange} />
        <WasteFields remanente={remanente} row={row} onChange={onChange} />
      </div>
      <RowBalanceIndicator remanente={remanente} row={row} />
    </div>
  );
};
