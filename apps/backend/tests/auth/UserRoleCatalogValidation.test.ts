import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/infrastructure/http/app.js';
import { InMemoryUserRepository } from '../../src/infrastructure/auth/repositories/InMemoryUserRepository.js';
import { InMemoryRoleRepository } from '../../src/infrastructure/security/repositories/InMemoryRoleRepository.js';
import { User } from '../../src/domain/auth/entities/User.js';
import { Pin } from '../../src/domain/auth/value-objects/Pin.js';

describe('TK-174: el rol de un operario se valida contra el catálogo Role en la aplicación', () => {
  const secret = 'test-secret-role-catalog-12345';
  let userRepo: InMemoryUserRepository;
  let roleRepo: InMemoryRoleRepository;
  let adminToken: string;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    roleRepo = new InMemoryRoleRepository();
    userRepo.seedUser(
      new User({ id: 'usr-cook-1', operatorCode: 'CK-01', name: 'Cocinero', role: 'KITCHEN_STAFF', pin: Pin.createFromRaw('1234'), status: 'ACTIVE', failedAttempts: 0 })
    );
    adminToken = jwt.sign({ sub: 'usr-admin-1', name: 'Admin', role: 'ADMIN' }, secret, { expiresIn: '1h' });
  });

  const app = () => createApp({ userRepository: userRepo, roleRepository: roleRepo, jwtSecret: secret });

  it('rechaza con 400 (no 404) el alta con un rol que no existe, lista los roles válidos y no persiste nada', async () => {
    const response = await request(app())
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fantasma', operatorCode: 'FX-01', role: 'ROL_INVENTADO', pin: '4321' });

    expect(response.status).toBe(400);
    expect(response.body.title).toBe('UnknownRoleException');
    expect(response.body.detail).toContain('ROL_INVENTADO');
    expect(response.body.detail).toContain('ADMIN');
    expect(response.body.detail).toContain('KITCHEN_STAFF');
    expect(await userRepo.findByOperatorCode('FX-01')).toBeNull();
  });

  it('rechaza con 400 la edición que asigna un rol que no existe y conserva el rol anterior', async () => {
    const response = await request(app())
      .put('/api/v1/auth/users/usr-cook-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ROL_INVENTADO' });

    expect(response.status).toBe(400);
    expect(response.body.title).toBe('UnknownRoleException');
    expect((await userRepo.findById('usr-cook-1'))!.role).toBe('KITCHEN_STAFF');
  });

  it('una edición sin rol no consulta el catálogo y sigue funcionando', async () => {
    const response = await request(app())
      .put('/api/v1/auth/users/usr-cook-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cocinero Renombrado' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Cocinero Renombrado', role: 'KITCHEN_STAFF' });
  });

  it('regresión US-015: un rol personalizado creado en runtime se puede asignar en el alta y en la edición', async () => {
    const created = await request(app())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'SUB_CHEF', permissionIds: ['perm-4'] });
    expect(created.status).toBe(201);

    const newUser = await request(app())
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sub Chef', operatorCode: 'SC-01', role: 'SUB_CHEF', pin: '4321' });
    expect(newUser.status).toBe(201);
    expect(newUser.body.role).toBe('SUB_CHEF');

    const promoted = await request(app())
      .put('/api/v1/auth/users/usr-cook-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUB_CHEF' });
    expect(promoted.status).toBe(200);
    expect(promoted.body.role).toBe('SUB_CHEF');
  });
});
