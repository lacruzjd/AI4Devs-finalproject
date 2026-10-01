import React, { useState } from 'react';
import { StockService } from '../../services/stock.service.js';
import { KitchenService, RecipeItem, RemanenteFEFOItem } from '../../../kitchen/services/kitchen.service.js';
import { mapToUserFriendlyError } from '../../../../shared/utils/errorMessageMapper.js';
import { DecimalQuantity } from '../../../../shared/domain/DecimalQuantity.js';
import { resolveUnitOfMeasure } from '../unitOfMeasure.js';
import { ExtractionFormProps, ExtractionPurpose, Insumo, stockAtSector } from './types.js';

const QTY_STEP = '0.5';
const QTY_MIN = '0.5';

function buildLocalRemanenteFromExtraction(
  selectedInsumoId: string,
  insumos: Insumo[],
  result: Awaited<ReturnType<typeof StockService.recordExtraction>> & { remanenteId: string }
) {
  return {
    id: result.remanenteId,
    insumoId: result.insumoId,
    insumoName: result.insumoName,
    unitOfMeasure: resolveUnitOfMeasure(selectedInsumoId, insumos),
    currentQuantity: result.quantityExtracted,
    initialQuantity: result.quantityExtracted,
    location: result.location,
    expirationDate: result.expirationDate,
    hoursRemaining: 24.0,
    isCriticalAlert: true,
    status: 'ACTIVE' as const,
  };
}

interface PerformExtractionArgs {
  activeInsumoId: string;
  quantity: number;
  location: string;
  fromStorageLocationId: string;
  purpose: ExtractionPurpose;
  reason: string;
  selectedRecipeId: string;
  plannedPortions: number;
  recipePreparationId: string;
  insumos: Insumo[];
  onSuccess: () => void;
  onClose: () => void;
}

async function performExtraction(args: PerformExtractionArgs) {
  const { activeInsumoId, quantity, location, fromStorageLocationId, purpose, reason, selectedRecipeId, plannedPortions, recipePreparationId, insumos, onSuccess, onClose } = args;
  const result = await StockService.recordExtraction({
    insumoId: activeInsumoId,
    quantity: quantity.toString(),
    fromStorageLocationId,
    // US-026: id del área de cocina del catálogo (el descarte directo no la usa).
    toStorageLocationId: purpose === 'DIRECT_DISCARD' ? undefined : location,
    purpose,
    reason: reason.trim() || undefined,
    recipeId: selectedRecipeId || undefined,
    // US-027: solo relevantes en modo RECIPE.
    plannedPortions: purpose === 'RECIPE' ? plannedPortions : undefined,
    recipePreparationId: purpose === 'RECIPE' && recipePreparationId ? recipePreparationId : undefined,
  });

  if (purpose !== 'DIRECT_DISCARD' && result.remanenteId !== null) {
    KitchenService.addLocalRemanente(
      buildLocalRemanenteFromExtraction(activeInsumoId, insumos, { ...result, remanenteId: result.remanenteId })
    );
  }
  onSuccess();
  onClose();
}

// US-021: detecta una apertura duplicada en CUALQUIER ubicacion de cocina al cambiar de insumo.
function useDuplicateRemanenteWarning(insumoId: string): RemanenteFEFOItem[] {
  const [duplicateActiveRemanentes, setDuplicateActiveRemanentes] = useState<RemanenteFEFOItem[]>([]);

  React.useEffect(() => {
    // Limpia la advertencia del insumo anterior de inmediato: de lo contrario, mientras la
    // nueva consulta esta en vuelo, el texto "ya existe un remanente activo de este insumo"
    // seguiria mostrando el remanente del insumo YA DESELECCIONADO (falso positivo transitorio).
    setDuplicateActiveRemanentes([]);
    if (!insumoId) return;

    let cancelled = false;
    KitchenService.checkActiveRemanente(insumoId).then((items) => {
      if (!cancelled) setDuplicateActiveRemanentes(items);
    });
    return () => {
      cancelled = true;
    };
  }, [insumoId]);

  return duplicateActiveRemanentes;
}

function useExtractionFields() {
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [quantity, setQuantity] = useState(1.0);
  const [purpose, setPurpose] = useState<ExtractionPurpose>('KITCHEN_STOCK');
  const [location, setLocation] = useState(''); // US-026: id del área de cocina; StorageSectorSelect auto-selecciona la primera
  const [fromStorageLocationId, setFromStorageLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [recipes, setRecipes] = useState<{ id: string; name: string }[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [plannedPortions, setPlannedPortions] = useState(1);
  const [recipePreparationId, setRecipePreparationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    KitchenService.fetchAvailableRecipes()
      .then((items: RecipeItem[]) => setRecipes(items.map((r: RecipeItem) => ({ id: r.id, name: r.name }))))
      .catch(() => setRecipes([]));
  }, []);

  return {
    selectedInsumoId, setSelectedInsumoId, quantity, setQuantity, purpose, setPurpose,
    location, setLocation, fromStorageLocationId, setFromStorageLocationId, reason, setReason,
    recipes, selectedRecipeId, setSelectedRecipeId, plannedPortions, setPlannedPortions,
    recipePreparationId, setRecipePreparationId, isSubmitting, setIsSubmitting, error, setError,
  };
}

// AUDIT-DEV-006 F-6: aritmética decimal (VO compartido), no `prev + 0.5` con flotantes.
const stepQuantityUp = (prev: number): number => new DecimalQuantity(prev).add(QTY_STEP).toNumber();
const stepQuantityDown = (prev: number): number =>
  new DecimalQuantity(prev).subtractClamped(QTY_STEP).clampMin(QTY_MIN).toNumber();

// US-025: el total de bodega puede estar todo en OTRO sub-sector — valida contra el saldo
// del sector de origen elegido, no contra el agregado (evita el 422 confuso; bug real
// reportado: insumo con stock total > 0 pero 0 en el sector auto-seleccionado).
function insufficientSectorStockError(insumo: Insumo | undefined, fromStorageLocationId: string, quantity: number): string | null {
  const available = stockAtSector(insumo, fromStorageLocationId);
  const requested = new DecimalQuantity(quantity || 0);
  if (!requested.isGreaterThan(available.toFixed(6))) return null;
  const unit = insumo?.unit ?? '';
  return `Stock insuficiente en este sector para "${insumo?.name ?? 'el insumo'}". Solicitado: ${requested.toFixed(3)} ${unit}, disponible en este sector: ${available.toFixed(3)} ${unit}.`;
}

function extractionValidationError(s: ReturnType<typeof useExtractionFields>, activeInsumoId: string, insumos: Insumo[]): string | null {
  if (s.purpose === 'DIRECT_DISCARD' && !s.reason.trim()) return 'Debe especificar el motivo descriptivo del descarte directo.';
  if (s.purpose === 'RECIPE' && !s.selectedRecipeId) return 'Debe seleccionar la receta que va a preparar.';
  if (!s.fromStorageLocationId) return 'Debe seleccionar el sub-sector de bodega de origen.';
  if (!new DecimalQuantity(s.quantity || 0).isPositive()) return 'La cantidad a extraer debe ser mayor que cero.';

  const insumo = insumos.find((i) => i.id === activeInsumoId);
  return insufficientSectorStockError(insumo, s.fromStorageLocationId, s.quantity);
}

export function useExtractionForm(insumos: Insumo[], onSuccess: () => void, onClose: () => void) {
  const s = useExtractionFields();
  const activeInsumoId = s.selectedInsumoId || (insumos.length > 0 ? insumos[0].id : '');
  const duplicateActiveRemanentes = useDuplicateRemanenteWarning(activeInsumoId);

  const handleIncrement = () => s.setQuantity(stepQuantityUp);
  const handleDecrement = () => s.setQuantity(stepQuantityDown);
  const validationError = (): string | null => extractionValidationError(s, activeInsumoId, insumos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInsumoId) return;
    const invalid = validationError();
    if (invalid) return s.setError(invalid);
    s.setIsSubmitting(true);
    s.setError(null);
    try {
      await performExtraction({
        activeInsumoId, quantity: s.quantity, location: s.location, fromStorageLocationId: s.fromStorageLocationId,
        purpose: s.purpose, reason: s.reason, selectedRecipeId: s.selectedRecipeId,
        plannedPortions: s.plannedPortions, recipePreparationId: s.recipePreparationId,
        insumos, onSuccess, onClose,
      });
    } catch (err) {
      console.error('[WarehouseExtractionModal] Error registrando la extraccion de bodega:', err);
      s.setError(mapToUserFriendlyError(err).message);
    } finally {
      s.setIsSubmitting(false);
    }
  };

  const bind: Omit<ExtractionFormProps, 'insumos' | 'onCancel'> = {
    selectedInsumoId: activeInsumoId,
    onInsumoChange: s.setSelectedInsumoId,
    purpose: s.purpose,
    onPurposeChange: s.setPurpose,
    location: s.location,
    onLocationChange: s.setLocation,
    fromStorageLocationId: s.fromStorageLocationId,
    onFromStorageLocationIdChange: s.setFromStorageLocationId,
    reason: s.reason,
    onReasonChange: s.setReason,
    recipes: s.recipes,
    selectedRecipeId: s.selectedRecipeId,
    onRecipeIdChange: s.setSelectedRecipeId,
    plannedPortions: s.plannedPortions,
    onPlannedPortionsChange: s.setPlannedPortions,
    recipePreparationId: s.recipePreparationId,
    onRecipePreparationIdChange: s.setRecipePreparationId,
    quantity: s.quantity,
    onIncrement: handleIncrement,
    onDecrement: handleDecrement,
    onQuantityChange: s.setQuantity,
    onSubmit: handleSubmit,
    isSubmitting: s.isSubmitting,
    duplicateActiveRemanentes,
  };

  return { error: s.error, bind };
}
