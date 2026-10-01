import React, { useState } from 'react';
import { StockService } from '../../services/stock.service.js';
import { mapToUserFriendlyError } from '../../../../shared/utils/errorMessageMapper.js';
import { Insumo } from './types.js';

interface AvailableInsumosState {
  insumos: Insumo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// AUDIT-DEV-006 F-5: sin fallback a lista demo estática. Si el backend falla, se expone
// el error para que el modal lo muestre y ofrezca reintentar — nunca insumos inventados.
export function useAvailableInsumos(isOpen: boolean): AvailableInsumosState {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    StockService.getInsumos()
      .then((items) => {
        if (cancelled) return;
        setInsumos(
          items.map((i) => ({
            id: i.id,
            name: i.name,
            stock: Number(i.warehouseStock),
            unit: i.unitOfMeasure,
            stockByLocation: i.stockByLocation ?? [],
            barcode: i.barcode ?? null,
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setInsumos([]);
        setError(mapToUserFriendlyError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadNonce]);

  return { insumos, loading, error, reload: () => setReloadNonce((n) => n + 1) };
}

// US-032/TK-119-FE: el componente de escaneo no sabe nada de insumos, solo emite el
// código decodificado. GET /stock/insumos (useAvailableInsumos) ya trae `barcode` por
// insumo con el mismo mapper que el endpoint dedicado de búsqueda — matchear contra el
// catálogo ya cargado en memoria evita una segunda llamada de red por cada escaneo y,
// de paso, garantiza que el insumo encontrado SIEMPRE está entre las opciones del
// selector manual (revisión adversarial: una búsqueda de servidor independiente podía,
// en teoría, devolver un id ausente del catálogo ya renderizado).
export function useBarcodeScan(insumos: Insumo[], onMatch: (insumoId: string) => void) {
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = (barcode: string) => {
    const insumo = insumos.find((i) => i.barcode === barcode);
    if (insumo) {
      setScanError(null);
      onMatch(insumo.id);
    } else {
      setScanError('Código no encontrado — solicita a un Administrador que lo dé de alta.');
    }
  };

  return { scanError, handleScan };
}
