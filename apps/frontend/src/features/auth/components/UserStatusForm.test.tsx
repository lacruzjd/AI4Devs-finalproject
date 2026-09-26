import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusForm } from './UserStatusForm.js';
import { UsersService } from '../services/users.service.js';
import { RolesService } from '../../security/services/roles.service.js';

/**
 * US-051 Escenario 2: el administrador debe poder leerle su código a un operario que
 * lo ha olvidado, sin acceso técnico al sistema. El DTO ya lo traía; la fila no lo pintaba.
 */
describe('TK-173-FE (US-051): la lista de personal muestra el codigo de cada operario', () => {
  beforeEach(() => {
    vi.spyOn(RolesService, 'fetchRoles').mockResolvedValue([]);
    vi.spyOn(UsersService, 'listUsers').mockResolvedValue([
      { id: 'uuid-1', operatorCode: 'CG-01', name: 'Carlos Gomez', role: 'KITCHEN_STAFF', status: 'ACTIVE' },
      { id: 'bootstrap-admin', operatorCode: 'bootstrap-admin', name: 'Administrador', role: 'ADMIN', status: 'ACTIVE' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cada fila expone el codigo junto al nombre', async () => {
    render(<UserStatusForm onUpdated={() => {}} />);

    expect(await screen.findByText('Carlos Gomez')).toBeInTheDocument();
    expect(screen.getByText(/CG-01/)).toBeInTheDocument();
    expect(screen.getByText(/bootstrap-admin/)).toBeInTheDocument();
  });
});
