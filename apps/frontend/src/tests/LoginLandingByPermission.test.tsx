import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '../app/AppShell.js';
import { BodegaRoute } from '../app/routes/BodegaRoute.js';
import { InventarioRoute } from '../app/routes/InventarioRoute.js';
import { seedSession, clearSession } from './helpers/session.js';

function mockLoginResponse(role: string, permissions: string[]) {
  vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/auth/login-pin')) {
      return {
        ok: true,
        // TK-140: la sesión viaja en cookie httpOnly; el cuerpo trae el usuario con sus permisos.
        json: async () => ({ user: { id: 'usr-1', name: 'Operario', role, permissions } }),
      } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
}

function loginWithPin() {
  fireEvent.change(screen.getByLabelText(/Código de Operario/i), { target: { value: 'OP-01' } });
  for (const digit of ['1', '2', '3', '4']) {
    fireEvent.click(screen.getByRole('button', { name: digit }));
  }
  fireEvent.click(screen.getByRole('button', { name: /Ingresar a Cocina/i }));
}

describe('TK-073-FE (US-015 Escenario 2): pantalla de aterrizaje tras el login según permisos', () => {
  // `MemoryRouter` para poder abrir el login en cualquier ruta inicial; el árbol es el mismo
  // que monta `app/router.tsx`.
  function renderLoginAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<InventarioRoute />} />
            <Route path="bodega" element={<BodegaRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  // Bajo `pnpm run test` en paralelo el montaje del tablero supera el segundo por defecto de
  // `waitFor`; el margen evita el falso rojo sin relajar lo que se comprueba (precedente TK-134).
  const LANDING_TIMEOUT = { timeout: 5000 };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('con kitchen:recipe_prepare aterriza en el Tablero FEFO de Cocina, aunque el login se abriera en otra ruta', async () => {
    mockLoginResponse('Cocinero Auxiliar', ['kitchen:recipe_prepare', 'stock:read']);
    renderLoginAt('/bodega');

    loginWithPin();

    await waitFor(() => expect(screen.getByText(/Tablero FEFO de Cocina/i)).toBeInTheDocument(), LANDING_TIMEOUT);
    expect(screen.queryByRole('heading', { name: 'Bodega' })).not.toBeInTheDocument();
  });

  it('sin kitchen:recipe_prepare aterriza en Bodega', async () => {
    mockLoginResponse('Bodeguero', ['stock:extract', 'stock:read']);
    renderLoginAt('/');

    loginWithPin();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bodega' })).toBeInTheDocument(), LANDING_TIMEOUT);
    expect(screen.queryByText(/Tablero FEFO de Cocina/i)).not.toBeInTheDocument();
  });
});

describe('TK-073-FE (US-015 Escenario 2): acciones de bodega según permisos', () => {
  afterEach(() => {
    clearSession();
  });

  function renderBodega() {
    return render(
      <MemoryRouter initialEntries={['/bodega']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="bodega" element={<BodegaRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('sin stock:extract no se ofrece "Extraer de Bodega"', async () => {
    seedSession({ role: 'Cocinero Auxiliar', permissions: ['kitchen:recipe_prepare', 'stock:read'] });
    renderBodega();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bodega' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Extraer de Bodega/i })).not.toBeInTheDocument();
  });

  it('con stock:extract sí se ofrece "Extraer de Bodega"', async () => {
    seedSession({ role: 'Bodeguero', permissions: ['stock:extract', 'stock:read'] });
    renderBodega();

    await waitFor(() => expect(screen.getByRole('button', { name: /Extraer de Bodega/i })).toBeInTheDocument());
  });
});
