import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/infrastructure/http/app.js';

/**
 * US-038 / TK-153 (ADR-007): el historial de movimientos deja de ser dato solo de
 * administración. Quien ya consulta el stock (`stock:read`) puede verlo, para resolver
 * un descuadre en su turno sin esperar a un administrador. Supersede el criterio de
 * `TK-050` ("dato administrativo — solo ADMIN"), conservado en el ADR.
 */
describe('TK-153: el historial de movimientos se abre a quien lee el stock', () => {
  const secret = 'test-secret-movements-access-123';
  const app = createApp({ jwtSecret: secret });
  const adminToken = jwt.sign({ sub: 'usr-admin', name: 'Admin', role: 'ADMIN' }, secret, { expiresIn: '1h' });

  async function tokenForRoleWith(permissionIds: string[], roleName: string): Promise<string> {
    const res = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: roleName, permissionIds });
    expect(res.status).toBe(201);
    return jwt.sign({ sub: `usr-${roleName}`, name: roleName, role: roleName }, secret, { expiresIn: '1h' });
  }

  it('un rol con solo stock:read consulta el historial', async () => {
    const token = await tokenForRoleWith(['perm-3'], 'OPERARIO_LECTURA_STOCK');

    const res = await request(app).get('/api/v1/stock/movements').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('un rol sin stock:read sigue sin acceso', async () => {
    const token = await tokenForRoleWith(['perm-6'], 'SOLO_REPORTES_MOVIMIENTOS');

    const res = await request(app).get('/api/v1/stock/movements').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('el reabastecimiento sigue restringido: este cambio solo abre /movements', async () => {
    const token = await tokenForRoleWith(['perm-3'], 'LECTURA_SIN_RESTOCK');

    const res = await request(app)
      .patch('/api/v1/stock/insumos/ins-1/restock')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: '1.000' });

    expect(res.status).toBe(403);
  });
});
