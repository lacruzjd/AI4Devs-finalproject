import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNav } from '../app/AppNav.js';
import { router } from '../app/router.js';
import { seedSession, clearSession, KITCHEN_STAFF_PERMISSIONS } from './helpers/session.js';

/**
 * US-038 / TK-153-FE (ADR-007): Movimientos sale de `/ajustes` y pasa a ser sección
 * propia, visible para quien tiene `stock:read`.
 */
describe('TK-153-FE: Movimientos como sección de primer nivel', () => {
  afterEach(() => {
    clearSession();
  });

  it('la ruta /movimientos existe y la antigua de ajustes sigue resolviendo', () => {
    const children = router.routes[0].children ?? [];
    expect(children.find((r) => r.path === 'movimientos')).toBeDefined();

    const ajustes = children.find((r) => r.path === 'ajustes');
    expect((ajustes?.children ?? []).find((r) => r.path === 'movimientos')).toBeDefined();
  });

  it('la entrada se muestra a quien tiene stock:read', () => {
    seedSession({ role: 'KITCHEN_STAFF', permissions: KITCHEN_STAFF_PERMISSIONS });

    render(<MemoryRouter><AppNav /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /Movimientos/i })).toBeInTheDocument();
  });

  it('no se muestra a quien no tiene stock:read', () => {
    seedSession({ role: 'INVITADO', permissions: [] });

    render(<MemoryRouter><AppNav /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: /Movimientos/i })).not.toBeInTheDocument();
  });
});
