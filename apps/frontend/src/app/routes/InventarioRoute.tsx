import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ArrowRightLeft, ShieldCheck, Utensils, ClipboardCheck, Thermometer, CheckCircle2 } from 'lucide-react';
import { ActionButton } from '../../shared/components/ActionButton.js';
import { bucketRemanentes, urgencyFromHours, type UrgencyLevel } from '../../shared/components/urgency.js';
import { KitchenService, RemanenteFEFOItem } from '../../features/kitchen/services/kitchen.service.js';
import { ActiveRemanentesList } from '../../features/kitchen/components/ActiveRemanentesList.js';
import { ConsumeReasonModal, ConsumeTarget } from '../../features/kitchen/components/ConsumeReasonModal.js';
import { WarehouseExtractionModal } from '../../features/stock/components/WarehouseExtractionModal.js';
import { DiscardModal } from '../../features/kitchen/components/DiscardModal.js';
import { RecipeSelectorModal } from '../../features/kitchen/components/RecipeSelectorModal.js';
import { ShiftReconciliationWizard } from '../../features/kitchen/components/ShiftReconciliationWizard.js';
import { FEFOInventoryHealthBar } from '../../features/kitchen/components/FEFOInventoryHealthBar.js';
import { AlertFeed } from '../../features/kitchen/components/AlertFeed.js';
import type { AlertItem } from '../../features/kitchen/components/SemaphoricCard.js';
import { OpenPreparationsPanel } from '../../features/kitchen/components/OpenPreparationsPanel.js';
import { LocationFilterTabs, LocationFilter } from '../../features/kitchen/components/LocationFilterTabs.js';
import { TemperatureLogModal } from '../../features/kitchen/components/TemperatureLogModal.js';
import { useAppShell } from '../session.js';
import styles from './InventarioRoute.module.css';

const STATUS_BUCKETS: { key: UrgencyLevel; label: string }[] = [
  { key: 'safe', label: 'Vigentes' },
  { key: 'warning', label: 'Vencimiento Próximo' },
  { key: 'critical', label: 'Críticos Hoy' },
  // US-040 / TK-155-FE: los vencidos van aparte — solo se descartan (INV-5).
  { key: 'expired', label: 'Vencidos' },
];

/** Panel Estado: 3 cubetas de severidad alineadas con los 3 segmentos de la health bar (TK-087-FE). */
const StatusPanel: React.FC<{ remanentes: RemanenteFEFOItem[] }> = ({ remanentes }) => {
  const buckets = bucketRemanentes(remanentes);

  return (
    <section className={styles['estado-panel']}>
      <h3 className="card-title mb-3">Estado</h3>
      {buckets.total === 0 ? (
        <p className="text-secondary-color fs-sm">Sin remanentes abiertos en cocina — nada que vigilar este turno.</p>
      ) : (
        <>
          <div className={styles['bucket-row']}>
            {STATUS_BUCKETS.map((b) => (
              <div key={b.key} className={styles.bucket}>
                <div className={`fs-2xl fw-black ${styles[`bucket-value--${b.key}`]}`}>{buckets[b.key]}</div>
                <div className="fs-xs text-secondary-color">{b.label}</div>
              </div>
            ))}
          </div>
          <FEFOInventoryHealthBar remanentes={remanentes} embedded />
        </>
      )}
    </section>
  );
};

interface AccionesEstadoGridProps {
  remanentes: RemanenteFEFOItem[];
  onExtract: () => void;
  onPrepareRecipe: () => void;
  onRecordTemperature: () => void;
}

const AccionesEstadoGrid: React.FC<AccionesEstadoGridProps> = ({ remanentes, onExtract, onPrepareRecipe, onRecordTemperature }) => (
  <section className={styles['acciones-estado-grid']}>
    <div className={styles['acciones-panel']}>
      <h3 className="card-title mb-3">Acciones</h3>
      <div className={styles['acciones-row']}>
        <ActionButton
          action="extract"
          label="Extraer de Bodega"
          hint="bodega → cocina"
          icon={<ArrowRightLeft size={26} />}
          onClick={onExtract}
          id="btn-open-extraction"
        />
        <ActionButton
          action="recipe"
          label="Preparar Receta"
          hint="consumo FEFO en cascada"
          icon={<Utensils size={26} />}
          onClick={onPrepareRecipe}
          id="btn-open-recipe"
        />
        {/* US-033/TK-120-FE: acción voluntaria de inicio de turno — nunca se auto-abre
            ni bloquea el tablero (decisión de negocio: solo advierte, jamás bloquea). */}
        <ActionButton
          action="temperature"
          label="Registrar Temperatura"
          hint="control sanitario"
          icon={<Thermometer size={26} />}
          onClick={onRecordTemperature}
          id="btn-open-temperature-log"
        />
      </div>
    </div>
    <StatusPanel remanentes={remanentes} />
  </section>
);

function useInventarioData() {
  const [remanentes, setRemanentes] = useState<RemanenteFEFOItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // TK-149-FE: el error deja de morir en la consola — el feed lo muestra con reintento.
  const [error, setError] = useState<string | null>(null);

  const loadRemanentes = useCallback(async () => {
    setIsLoading(true);
    try {
      setRemanentes(await KitchenService.fetchActiveRemanentes());
      setError(null);
    } catch (err) {
      console.error('[InventarioRoute] Error cargando remanentes activos:', err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los remanentes activos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRemanentes();
  }, [loadRemanentes]);

  return { remanentes, isLoading, error, loadRemanentes };
}

/**
 * TK-149-FE: el feed resume lo que necesita atención ahora — solo los remanentes que no
 * están vigentes, con la misma escala FEFO que el resto de la pantalla (`urgency.ts`), y
 * acotado al área seleccionada para que resuma exactamente lo que se está mirando.
 * La lista completa sigue debajo; esto es el resumen accionable, no un segundo listado.
 */
const MAX_ALERTS = 4;

/**
 * US-026 / TK-112-FE: cuenta y filtra por `storageLocationId` (id real del área), no por el
 * literal `location` — desde TK-102-FE `location` guarda el nombre del área, y las pestañas
 * antiguas siempre mostraban 0 (confirmado contra la base real).
 */
function filterByLocation(remanentes: RemanenteFEFOItem[], activeLocation: LocationFilter) {
  const counts: Record<string, number> = { ALL: remanentes.length };
  for (const r of remanentes) {
    if (!r.storageLocationId) continue;
    counts[r.storageLocationId] = (counts[r.storageLocationId] ?? 0) + 1;
  }
  const filtered = activeLocation === 'ALL' ? remanentes : remanentes.filter((r) => r.storageLocationId === activeLocation);
  return { counts, filtered };
}

interface UrgentAlertsProps {
  remanentes: RemanenteFEFOItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onConsume: (item: RemanenteFEFOItem) => void;
  onDiscard: (item: RemanenteFEFOItem) => void;
}

/**
 * Resumen accionable de lo urgente, sobre la lista completa (TK-149-FE).
 * US-039 / TK-154-FE: sin nada urgente se reduce a una línea — el panel informa, pero no
 * empuja el tablero fuera de la pantalla en una cocina que va al día.
 */
const UrgentAlerts: React.FC<UrgentAlertsProps> = ({ remanentes, isLoading, error, onRetry, onConsume, onDiscard }) => {
  const alerts = toAlertItems(remanentes);

  if (!isLoading && !error && alerts.length === 0) {
    return (
      <p className={styles['sin-urgencias']}>
        <CheckCircle2 size={18} aria-hidden="true" /> Nada urgente ahora mismo
      </p>
    );
  }

  return (
  <AlertFeed
    alerts={alerts}
    isLoading={isLoading}
    error={error}
    onRetry={onRetry}
    onAction={(id, action) => {
      const target = remanentes.find((r) => r.id === id);
      if (!target) return;
      if (action === 'discard') onDiscard(target);
      else onConsume(target);
    }}
  />
  );
};

function toAlertItems(remanentes: RemanenteFEFOItem[]): AlertItem[] {
  return remanentes
    .filter((r) => urgencyFromHours(r.hoursRemaining).level !== 'safe')
    .sort((a, b) => a.hoursRemaining - b.hoursRemaining)
    .slice(0, MAX_ALERTS)
    .map((r) => ({
      id: r.id,
      ingredientName: r.insumoName,
      lotNumber: r.id.slice(-6).toUpperCase(),
      hoursRemaining: Math.round(r.hoursRemaining),
      quantity: r.currentQuantity,
      unit: r.unitOfMeasure,
    }));
}

function useKitchenOpModals() {
  const [isExtractionOpen, setIsExtractionOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [isTemperatureLogOpen, setIsTemperatureLogOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<RemanenteFEFOItem | null>(null);
  // ADR-004 / TK-108-FE: los botones rápidos de cantidad abren el modal de motivo,
  // en vez de consumir directo (mismo patrón que discardTarget).
  const [consumeTarget, setConsumeTarget] = useState<ConsumeTarget | null>(null);
  return {
    isExtractionOpen,
    setIsExtractionOpen,
    isRecipeOpen,
    setIsRecipeOpen,
    isReconciliationOpen,
    setIsReconciliationOpen,
    isTemperatureLogOpen,
    setIsTemperatureLogOpen,
    discardTarget,
    setDiscardTarget,
    consumeTarget,
    setConsumeTarget,
  };
}

/* TK-095-FE WS-3 #13: el artefacto va directo a la rejilla Acciones|Estado — sin
   h1 de página (el wordmark lateral + la pestaña activa identifican la vista).
   Conciliar/Sincronizar quedan como una barra de acciones discreta alineada a la derecha. */
const PageHeading: React.FC<{ isLoading: boolean; onSync: () => void; onReconcile: () => void }> = ({ isLoading, onSync, onReconcile }) => (
  <div className="flex-gap-md flex-wrap justify-end mb-4">
    <button type="button" className="btn-touch btn-secondary" onClick={onReconcile} id="btn-open-reconciliation" title="Cierre de Turno y Conciliación">
      <ClipboardCheck size={20} />
      Conciliar Turno
    </button>
    <button type="button" className="btn-touch btn-secondary" onClick={onSync} disabled={isLoading} id="btn-sync-remanentes" title="Sincronizar Remanentes">
      <RefreshCw size={20} className={isLoading ? 'spin' : ''} />
      Sincronizar
    </button>
  </div>
);

const KitchenBoardTitle: React.FC = () => (
  <div className="mb-4">
    <h2 className="flex-gap-sm fs-xl fw-bold">
      <ShieldCheck className="text-primary-color" /> Tablero FEFO de Cocina (Prioridad por Expiración)
    </h2>
  </div>
);

/** Ruta Inventario (`/`, US-023): el Tablero FEFO de cocina, antes cuerpo de `App.tsx`. */
export const InventarioRoute: React.FC = () => {
  const { currentUser } = useAppShell();
  const { remanentes, isLoading, error, loadRemanentes } = useInventarioData();
  const modals = useKitchenOpModals();
  const [activeLocation, setActiveLocation] = useState<LocationFilter>('ALL');

  const { counts, filtered } = filterByLocation(remanentes, activeLocation);

  return (
    <>
      <PageHeading
        isLoading={isLoading}
        onSync={loadRemanentes}
        onReconcile={() => modals.setIsReconciliationOpen(true)}
      />
      <AccionesEstadoGrid
        remanentes={remanentes}
        onExtract={() => modals.setIsExtractionOpen(true)}
        onPrepareRecipe={() => modals.setIsRecipeOpen(true)}
        onRecordTemperature={() => modals.setIsTemperatureLogOpen(true)}
      />
      <UrgentAlerts
        remanentes={filtered}
        isLoading={isLoading}
        error={error}
        onRetry={loadRemanentes}
        onConsume={(item) => modals.setConsumeTarget({ remanente: item, quantity: 1 })}
        onDiscard={(item) => modals.setDiscardTarget(item)}
      />
      {/* US-027/US-028: preparaciones de receta abiertas — el panel se auto-oculta si no hay ninguna. */}
      <OpenPreparationsPanel reloadKey={remanentes.length} onReconciled={loadRemanentes} />
      <KitchenBoardTitle />
      <LocationFilterTabs activeLocation={activeLocation} onLocationSelect={setActiveLocation} counts={counts} />
      <main>
        <ActiveRemanentesList
          items={filtered}
          onRequestConsume={(item, qty) => modals.setConsumeTarget({ remanente: item, quantity: qty })}
          onDiscard={(item) => modals.setDiscardTarget(item)}
        />
      </main>

      <WarehouseExtractionModal isOpen={modals.isExtractionOpen} onClose={() => modals.setIsExtractionOpen(false)} onSuccess={loadRemanentes} />
      <RecipeSelectorModal isOpen={modals.isRecipeOpen} onClose={() => modals.setIsRecipeOpen(false)} onSuccess={loadRemanentes} />
      <DiscardModal remanente={modals.discardTarget} onClose={() => modals.setDiscardTarget(null)} onSuccess={loadRemanentes} />
      <ConsumeReasonModal target={modals.consumeTarget} onClose={() => modals.setConsumeTarget(null)} onSuccess={loadRemanentes} />
      <TemperatureLogModal isOpen={modals.isTemperatureLogOpen} onClose={() => modals.setIsTemperatureLogOpen(false)} />
      <ShiftReconciliationWizard
        isOpen={modals.isReconciliationOpen}
        remanentes={remanentes}
        operatorId={currentUser.id}
        onClose={() => modals.setIsReconciliationOpen(false)}
        onSuccess={loadRemanentes}
      />
    </>
  );
};
