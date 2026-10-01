import React from 'react';
import { StockByLocationEntry } from '../../services/stock.service.js';
import { RemanenteFEFOItem } from '../../../kitchen/services/kitchen.service.js';
import { DecimalQuantity } from '../../../../shared/domain/DecimalQuantity.js';

export type ExtractionPurpose = 'KITCHEN_STOCK' | 'RECIPE' | 'DIRECT_DISCARD';

export interface Insumo {
  id: string;
  name: string;
  stock: number;
  unit: string;
  /** US-025: saldo por sub-sector — el total (`stock`) puede estar en un sector distinto
      al elegido como origen; sin esto el operario no sabe por qué "hay stock" pero la
      extracción falla con 422 (bug real reportado: leche 10L en Cámara de Congelados,
      Bodega de Secos con 0). */
  stockByLocation: StockByLocationEntry[];
  /** US-032: código de barras, ya incluido en la respuesta de GET /stock/insumos —
      permite matchear el escaneo contra el catálogo ya cargado en memoria, sin una
      segunda llamada de red (TK-119-FE, revisión adversarial). */
  barcode: string | null;
}

export function stockAtSector(insumo: Insumo | undefined, storageLocationId: string): DecimalQuantity {
  const entry = insumo?.stockByLocation.find((l) => l.storageLocationId === storageLocationId);
  return new DecimalQuantity(entry?.quantity ?? '0');
}

export interface ExtractionSelectFieldsProps {
  insumos: Insumo[];
  selectedInsumoId: string;
  onInsumoChange: (id: string) => void;
  purpose: ExtractionPurpose;
  onPurposeChange: (purpose: ExtractionPurpose) => void;
  location: string;
  onLocationChange: (location: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  recipes: { id: string; name: string }[];
  selectedRecipeId: string;
  onRecipeIdChange: (id: string) => void;
  plannedPortions: number;
  onPlannedPortionsChange: (n: number) => void;
  recipePreparationId: string;
  onRecipePreparationIdChange: (id: string) => void;
}

export interface ExtractionFormProps extends ExtractionSelectFieldsProps {
  fromStorageLocationId: string;
  onFromStorageLocationIdChange: (id: string) => void;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onQuantityChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  duplicateActiveRemanentes: RemanenteFEFOItem[];
}
