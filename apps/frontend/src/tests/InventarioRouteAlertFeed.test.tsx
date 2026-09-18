import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventarioRoute } from '../app/routes/InventarioRoute';
import { KitchenService, type RemanenteFEFOItem } from '../features/kitchen/services/kitchen.service';
import { AppShellCtx } from '../app/session';

const shellContext = {
  currentUser: { id: 'u-1', name: 'Operaria de turno', role: 'OPERARIO' },
  onLogout: () => {},
  reloadUser: () => {},
};

function renderRoute() {
  return render(
    <MemoryRouter>
      <AppShellCtx.Provider value={shellContext}>
        <InventarioRoute />
      </AppShellCtx.Provider>
    </MemoryRouter>,
  );
}

function remanente(overrides: Partial<RemanenteFEFOItem> = {}): RemanenteFEFOItem {
  return {
    id: 'rem-1',
    insumoId: 'ins-1',
    insumoName: 'Salsa de tomate',
    unitOfMeasure: 'KG',
    currentQuantity: '1.000',
    initialQuantity: '2.000',
    location: 'KITCHEN_FRIDGE',
    expirationDate: new Date().toISOString(),
    hoursRemaining: 3,
    isCriticalAlert: true,
    status: 'ACTIVE',
    ...overrides,
  } as RemanenteFEFOItem;
}

describe('TK-149-FE: el feed de alertas FEFO está montado en la ruta', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra las alertas de los remanentes en riesgo, sin pedir los datos otra vez', async () => {
    const fetchSpy = vi
      .spyOn(KitchenService, 'fetchActiveRemanentes')
      .mockResolvedValue([
        remanente({ id: 'rem-urgente', insumoName: 'Crema', hoursRemaining: 3 }),
        remanente({ id: 'rem-tranquilo', insumoName: 'Harina', hoursRemaining: 200, isCriticalAlert: false }),
      ]);

    renderRoute();

    await waitFor(() => expect(screen.getByTestId('semaphoric-card-rem-urgente')).toBeInTheDocument());
    // El remanente vigente no genera alerta: el feed muestra solo lo que necesita atención.
    expect(screen.queryByTestId('semaphoric-card-rem-tranquilo')).toBeNull();
    // Una sola carga: el feed reutiliza los remanentes de la ruta (no dispara su propia petición).
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('si la carga falla, muestra el error con su acción de reintento', async () => {
    vi.spyOn(KitchenService, 'fetchActiveRemanentes').mockRejectedValue(new Error('Red caída'));

    renderRoute();

    await waitFor(() => expect(screen.getByText('Error al Cargar Alertas')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Reintentar Carga/i })).toBeInTheDocument();
  });
});
