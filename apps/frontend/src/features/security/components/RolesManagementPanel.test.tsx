import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RolesManagementPanel } from './RolesManagementPanel.js';
import { RolesService, PermissionDto } from '../services/roles.service.js';

const PERMS: PermissionDto[] = [
  { id: 'perm-1', code: 'stock:extract', name: 'Extraer Insumos', module: 'STOCK' },
  { id: 'perm-3', code: 'stock:read', name: 'Consultar Stock', module: 'STOCK' },
];

/**
 * Doble del servidor: `PUT /roles/:id/permissions` REEMPLAZA la matriz completa
 * (`deleteMany` + `createMany` en `PrismaRoleRepository`). Modelarlo así es lo que
 * hace visible el defecto de AUDIT-DEV-017 F-1: partir de un estado obsoleto no
 * produce una vista vieja, produce una escritura que revierte la concesión anterior.
 */
let serverPermissionIds: string[] = [];

function mockServer(): void {
  vi.spyOn(RolesService, 'fetchPermissions').mockResolvedValue(PERMS);
  vi.spyOn(RolesService, 'fetchRoles').mockImplementation(async () => [
    {
      id: 'role-test',
      name: 'TEST',
      permissions: PERMS.filter((p) => serverPermissionIds.includes(p.id)),
    },
  ]);
  vi.spyOn(RolesService, 'updateRolePermissions').mockImplementation(async (_roleId, ids) => {
    serverPermissionIds = [...ids];
  });
}

const activeCheckCount = () => document.querySelectorAll('.permission-check-indicator--active').length;

describe('TK-172-FE (AUDIT-DEV-017 F-1/F-3): matriz de permisos', () => {
  beforeEach(() => {
    serverPermissionIds = [];
    mockServer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marca el permiso como concedido tras un guardado con exito', async () => {
    render(<RolesManagementPanel />);

    fireEvent.click(await screen.findByText('Extraer Insumos'));

    await waitFor(() => expect(serverPermissionIds).toEqual(['perm-1']));
    await waitFor(() => expect(activeCheckCount()).toBe(1));
  });

  it('acumula un segundo permiso sin destruir el primero', async () => {
    render(<RolesManagementPanel />);

    fireEvent.click(await screen.findByText('Extraer Insumos'));
    await waitFor(() => expect(serverPermissionIds).toEqual(['perm-1']));

    fireEvent.click(await screen.findByText('Consultar Stock'));

    await waitFor(() => expect(serverPermissionIds).toHaveLength(2));
    expect([...serverPermissionIds].sort()).toEqual(['perm-1', 'perm-3']);
    await waitFor(() => expect(activeCheckCount()).toBe(2));
  });

  it('retira solo el permiso desmarcado', async () => {
    serverPermissionIds = ['perm-1', 'perm-3'];
    render(<RolesManagementPanel />);

    await waitFor(() => expect(activeCheckCount()).toBe(2));
    fireEvent.click(screen.getByText('Extraer Insumos'));

    await waitFor(() => expect(serverPermissionIds).toEqual(['perm-3']));
    await waitFor(() => expect(activeCheckCount()).toBe(1));
  });

  it('muestra el error de carga en vez de una lista muda (Guard 6 §2)', async () => {
    vi.spyOn(RolesService, 'fetchPermissions').mockRejectedValue(new Error('backend caido'));

    render(<RolesManagementPanel />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
