import React, { useState } from 'react';
import {
  RecipePreparationsService,
  RecipePreparationSummary,
} from '../../../kitchen/services/recipePreparations.service.js';
import { StorageSectorSelect } from '../StorageSectorSelect.js';
import { ExtractionPurpose, ExtractionSelectFieldsProps, Insumo } from './types.js';

interface InsumoPurposeSelectProps {
  insumos: Insumo[];
  selectedInsumoId: string;
  onInsumoChange: (id: string) => void;
  purpose: ExtractionPurpose;
  onPurposeChange: (purpose: ExtractionPurpose) => void;
}

const InsumoPurposeSelect: React.FC<InsumoPurposeSelectProps> = ({
  insumos,
  selectedInsumoId,
  onInsumoChange,
  purpose,
  onPurposeChange,
}) => (
  <>
    <div>
      <label htmlFor="select-insumo-extraction" className="form-label">
        Seleccionar Insumo de Bodega:
      </label>
      <select
        value={selectedInsumoId}
        onChange={(e) => onInsumoChange(e.target.value)}
        className="input-touch"
        id="select-insumo-extraction"
      >
        {insumos.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} (Stock Bodega: {i.stock} {i.unit})
          </option>
        ))}
      </select>
    </div>

    <div>
      <label htmlFor="select-purpose-extraction" className="form-label">
        Propósito / Motivo de Extracción:
      </label>
      <select
        value={purpose}
        onChange={(e) => onPurposeChange(e.target.value as ExtractionPurpose)}
        className="input-touch"
        id="select-purpose-extraction"
      >
        <option value="KITCHEN_STOCK">Uso General en Cocina (Stock Activo)</option>
        <option value="RECIPE">Preparación de Receta Específica</option>
        <option value="DIRECT_DISCARD">Descarte Directo desde Bodega (Merma/Deterioro)</option>
      </select>
    </div>
  </>
);

interface RecipeDestinationFieldProps {
  recipes: { id: string; name: string }[];
  selectedRecipeId: string;
  onRecipeIdChange: (id: string) => void;
  plannedPortions: number;
  onPlannedPortionsChange: (n: number) => void;
  recipePreparationId: string;
  onRecipePreparationIdChange: (id: string) => void;
}

// US-027: al elegir una receta, ofrece "añadir a una preparación en curso" si hay alguna abierta.
function useOpenPreparationsForRecipe(recipeId: string) {
  const [openPreps, setOpenPreps] = useState<RecipePreparationSummary[]>([]);
  React.useEffect(() => {
    if (!recipeId) {
      setOpenPreps([]);
      return;
    }
    let cancelled = false;
    RecipePreparationsService.list('OPEN')
      .then((all) => {
        if (!cancelled) setOpenPreps(all.filter((p) => p.recipeId === recipeId));
      })
      .catch(() => {
        if (!cancelled) setOpenPreps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);
  return openPreps;
}

const RecipeSelect: React.FC<{ recipes: { id: string; name: string }[]; value: string; onChange: (id: string) => void }> = ({ recipes, value, onChange }) => (
  <div>
    <label htmlFor="select-recipe-extraction" className="form-label">Seleccionar Receta Destino *:</label>
    {/* US-027: la receta es obligatoria en modo RECIPE — validado en extractionValidationError
        (mismo patrón que el motivo de descarte), no con `required` nativo, para mostrar el
        ErrorBanner del modal en vez del popup del navegador (Guard 38). */}
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-touch" id="select-recipe-extraction">
      <option value="">-- Seleccionar Receta --</option>
      {recipes.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>
);

const PlannedPortionsInput: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => (
  <div>
    <label htmlFor="input-planned-portions" className="form-label">Porciones Planificadas:</label>
    <input
      type="number"
      min="1"
      step="1"
      value={value}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        onChange(Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1);
      }}
      className="input-touch"
      id="input-planned-portions"
    />
  </div>
);

const OpenPreparationSelect: React.FC<{ openPreps: RecipePreparationSummary[]; value: string; onChange: (id: string) => void }> = ({ openPreps, value, onChange }) => (
  <div>
    <label htmlFor="select-open-preparation" className="form-label">Añadir a Preparación en Curso (opcional):</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-touch" id="select-open-preparation">
      <option value="">-- Nueva preparación --</option>
      {openPreps.map((p) => (
        <option key={p.id} value={p.id}>
          {p.plannedPortions} porciones · abierta {new Date(p.openedAt).toLocaleTimeString()}
        </option>
      ))}
    </select>
  </div>
);

const RecipeDestinationField: React.FC<RecipeDestinationFieldProps> = ({
  recipes,
  selectedRecipeId,
  onRecipeIdChange,
  plannedPortions,
  onPlannedPortionsChange,
  recipePreparationId,
  onRecipePreparationIdChange,
}) => {
  const openPreps = useOpenPreparationsForRecipe(selectedRecipeId);
  return (
    <>
      <RecipeSelect
        recipes={recipes}
        value={selectedRecipeId}
        onChange={(id) => {
          onRecipeIdChange(id);
          onRecipePreparationIdChange('');
        }}
      />
      <PlannedPortionsInput value={plannedPortions} onChange={onPlannedPortionsChange} />
      {openPreps.length > 0 && (
        <OpenPreparationSelect openPreps={openPreps} value={recipePreparationId} onChange={onRecipePreparationIdChange} />
      )}
    </>
  );
};

const DiscardReasonField: React.FC<{ reason: string; onReasonChange: (r: string) => void }> = ({ reason, onReasonChange }) => (
  <div>
    <label htmlFor="input-reason-extraction" className="form-label">
      Motivo de Descarte (Obligatorio):
    </label>
    <input
      type="text"
      value={reason}
      onChange={(e) => onReasonChange(e.target.value)}
      placeholder="Ej: Empaque roto en transporte, vencido en bodega"
      className="input-touch"
      id="input-reason-extraction"
      required
    />
  </div>
);

const KitchenDestinationField: React.FC<{ location: string; onLocationChange: (l: string) => void }> = ({ location, onLocationChange }) => (
  // US-026: áreas de cocina del catálogo (StorageLocation type=KITCHEN), sin literales.
  <StorageSectorSelect
    id="select-location-extraction"
    label="Ubicación Destino en Cocina *"
    areaType="KITCHEN"
    value={location}
    onChange={onLocationChange}
  />
);

export const ExtractionSelectFields: React.FC<ExtractionSelectFieldsProps> = ({
  insumos,
  selectedInsumoId,
  onInsumoChange,
  purpose,
  onPurposeChange,
  location,
  onLocationChange,
  reason,
  onReasonChange,
  recipes,
  selectedRecipeId,
  onRecipeIdChange,
  plannedPortions,
  onPlannedPortionsChange,
  recipePreparationId,
  onRecipePreparationIdChange,
}) => (
  <>
    <InsumoPurposeSelect insumos={insumos} selectedInsumoId={selectedInsumoId} onInsumoChange={onInsumoChange} purpose={purpose} onPurposeChange={onPurposeChange} />
    {purpose === 'RECIPE' && (
      <RecipeDestinationField
        recipes={recipes}
        selectedRecipeId={selectedRecipeId}
        onRecipeIdChange={onRecipeIdChange}
        plannedPortions={plannedPortions}
        onPlannedPortionsChange={onPlannedPortionsChange}
        recipePreparationId={recipePreparationId}
        onRecipePreparationIdChange={onRecipePreparationIdChange}
      />
    )}
    {purpose === 'DIRECT_DISCARD' ? (
      <DiscardReasonField reason={reason} onReasonChange={onReasonChange} />
    ) : (
      <KitchenDestinationField location={location} onLocationChange={onLocationChange} />
    )}
  </>
);
