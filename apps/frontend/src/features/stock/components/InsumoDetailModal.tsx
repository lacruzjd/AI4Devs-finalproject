import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal.js';
import { ModalHeader } from '../../../shared/components/ModalHeader.js';
import { ErrorBanner } from '../../../shared/components/ErrorBanner.js';
import { StockService, type InsumoItem, type StockMovementHistoryItem } from '../services/stock.service.js';
import { formatQuantity, formatUnitLabel } from '../../../utils/formatters.js';

interface InsumoDetailModalProps {
  /** `null` mantiene la ficha cerrada: no se consulta nada hasta que hay insumo. */
  insumo: InsumoItem | null;
  onClose: () => void;
  onRestock: (insumo: InsumoItem) => void;
  canManage: boolean;
}

/** US-042 / TK-157-FE: los últimos movimientos bastan para entender un descuadre; el histórico completo vive en la sección Movimientos. */
const RECENT_MOVEMENTS = 10;

const StockBySector: React.FC<{ insumo: InsumoItem }> = ({ insumo }) => (
  <section className="mb-4">
    <h4 className="card-title mb-2">Stock por sector</h4>
    {(insumo.stockByLocation ?? []).length === 0 ? (
      <p className="text-secondary-color fs-sm">Sin desglose por sector.</p>
    ) : (
      <ul className="list-reset">
        {(insumo.stockByLocation ?? []).map((line) => (
          <li key={line.storageLocationId} className="flex-between">
            <span>{line.storageLocationName}</span>
            <strong>{formatQuantity(line.quantity)} {formatUnitLabel(insumo.unitOfMeasure)}</strong>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const MovementList: React.FC<{ movements: StockMovementHistoryItem[]; loading: boolean }> = ({ movements, loading }) => {
  if (loading) return <p className="text-secondary-color fs-sm">Cargando movimientos...</p>;
  if (movements.length === 0) {
    return <p className="text-secondary-color fs-sm">Este insumo todavía no tiene movimientos registrados.</p>;
  }
  return (
    <ul className="list-reset">
      {movements.map((mov) => (
        <li key={mov.id} className="flex-between">
          <span>{mov.type} · {mov.fromLoc} → {mov.toLoc}</span>
          <strong>{formatQuantity(mov.quantity)}</strong>
        </li>
      ))}
    </ul>
  );
};

export const InsumoDetailModal: React.FC<InsumoDetailModalProps> = ({ insumo, onClose, onRestock, canManage }) => {
  const [movements, setMovements] = useState<StockMovementHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!insumo) return;
    let active = true;
    setLoading(true);
    StockService.getMovementHistory({ insumoId: insumo.id })
      .then((data) => active && setMovements(data.slice(0, RECENT_MOVEMENTS)))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [insumo]);

  if (!insumo) return null;

  return (
    <Modal size="lg">
      <ModalHeader icon={<Package size={22} />} title={insumo.name} size="lg" onClose={onClose} />
      {error && <ErrorBanner message={error} />}
      <StockBySector insumo={insumo} />
      <section>
        <h4 className="card-title mb-2">Movimientos recientes</h4>
        <MovementList movements={movements} loading={loading} />
      </section>
      <div className="flex-gap-sm mt-4">
        {canManage && (
          <button type="button" className="btn-touch btn-primary" onClick={() => onRestock(insumo)}>
            Reponer stock
          </button>
        )}
        <button type="button" className="btn-touch btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
};
