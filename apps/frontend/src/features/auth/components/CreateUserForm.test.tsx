import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CreateUserForm } from './CreateUserForm.js';
import { UsersService } from '../services/users.service.js';
import { RolesService } from '../../security/services/roles.service.js';

/**
 * US-051 / TK-173-FE (AUDIT-DEV-017 F-2): el alta no pedía ni mostraba la credencial
 * de acceso, así que el operario creado no podía entrar — el `crypto.randomUUID()`
 * interno era la única credencial que el login aceptaba y ninguna pantalla lo exponía.
 */
describe('TK-173-FE (US-051): el alta pide y devuelve el codigo de operario', () => {
  beforeEach(() => {
    vi.spyOn(RolesService, 'fetchRoles').mockResolvedValue([
      { id: 'role-kitchen', name: 'KITCHEN_STAFF', permissions: [] },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const rellenarAlta = async (codigo: string) => {
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), { target: { value: 'Carlos Gomez' } });
    fireEvent.change(await screen.findByLabelText(/Código de Operario/i), { target: { value: codigo } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: '4321' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear Operario/i }));
  };

  it('envia el codigo tecleado al backend', async () => {
    const createUser = vi.spyOn(UsersService, 'createUser').mockResolvedValue({
      id: 'uuid-interno', operatorCode: 'CG-01', name: 'Carlos Gomez', role: 'KITCHEN_STAFF', status: 'ACTIVE',
    });

    render(<CreateUserForm onCreated={() => {}} />);
    await rellenarAlta('CG-01');

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Carlos Gomez', operatorCode: 'CG-01', pin: '4321' }))
    );
  });

  it('la confirmacion muestra el codigo, no solo el nombre (Escenario 1)', async () => {
    vi.spyOn(UsersService, 'createUser').mockResolvedValue({
      id: 'uuid-interno', operatorCode: 'CG-01', name: 'Carlos Gomez', role: 'KITCHEN_STAFF', status: 'ACTIVE',
    });
    const onCreated = vi.fn();

    render(<CreateUserForm onCreated={onCreated} />);
    await rellenarAlta('CG-01');

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onCreated.mock.calls[0][0]).toContain('CG-01');
  });

  it('un codigo ya en uso llega al operador como mensaje accionable, no como "Error HTTP 409"', async () => {
    vi.spyOn(UsersService, 'createUser').mockRejectedValue(
      new Error("El código de operario 'CG-01' ya está en uso por otro miembro del personal.")
    );

    render(<CreateUserForm onCreated={() => {}} />);
    await rellenarAlta('CG-01');

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('CG-01');
    expect(alerta.textContent).not.toContain('Error HTTP');
  });
});
