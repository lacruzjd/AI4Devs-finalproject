import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InsumoDetailModal } from '../features/stock/components/InsumoDetailModal.js';
import { StockService, type InsumoItem } from '../features/stock/services/stock.service.js';

const insumo: InsumoItem = {
  id: 'ins-1',
  name: 'Queso Parmesano',
  unitOfMeasure: 'KG',
  warehouseStock: '12.500',
  stockByLocation: [{ storageLocationId: 'loc-1', storageLocationName: 'Bodega de Secos', quantity: '12.500' }],
} as InsumoItem;

describe('US-042/TK-157-FE: ficha de insumo con sus movimientos recientes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el stock por sector y los movimientos del insumo', async () => {
    const spy = vi.spyOn(StockService, 'getMovementHistory').mockResolvedValue([
      { id: 'mov-1', insumoId: 'ins-1', insumoName: 'Queso Parmesano', type: 'EXTRACTION', quantity: '2.000', fromLoc: 'Bodega de Secos', toLoc: 'Cocina', createdAt: '2026-09-18T10:00:00.000Z' },
    ] as never);

    render(<InsumoDetailModal insumo={insumo} onClose={vi.fn()} onRestock={vi.fn()} canManage />);

    await waitFor(() => expect(screen.getByText(/Bodega de Secos/)).toBeInTheDocument());
    expect(screen.getByText(/EXTRACTION/)).toBeInTheDocument();
    // Reutiliza el endpoint existente filtrado por insumo: sin endpoint nuevo.
    expect(spy).toHaveBeenCalledWith({ insumoId: 'ins-1' });
  });

  it('sin movimientos, explica que aún no tiene', async () => {
    vi.spyOn(StockService, 'getMovementHistory').mockResolvedValue([] as never);

    render(<InsumoDetailModal insumo={insumo} onClose={vi.fn()} onRestock={vi.fn()} canManage />);

    await waitFor(() => expect(screen.getByText(/todavía no tiene movimientos/i)).toBeInTheDocument());
  });

  it('cerrada, no consulta nada', () => {
    const spy = vi.spyOn(StockService, 'getMovementHistory');

    render(<InsumoDetailModal insumo={null} onClose={vi.fn()} onRestock={vi.fn()} canManage />);

    expect(spy).not.toHaveBeenCalled();
  });
});
