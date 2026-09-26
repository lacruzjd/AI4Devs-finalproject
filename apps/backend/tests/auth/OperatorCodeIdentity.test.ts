import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/infrastructure/http/app.js';
import { InMemoryUserRepository } from '../../src/infrastructure/auth/repositories/InMemoryUserRepository.js';
import { User } from '../../src/domain/auth/entities/User.js';
import { Pin } from '../../src/domain/auth/value-objects/Pin.js';

/**
 * US-051 / TK-173 (AUDIT-DEV-017 F-2): hasta este ticket la única credencial que
 * `login-pin` aceptaba era el `crypto.randomUUID()` interno, que ninguna superficie
 * de la interfaz mostraba — el administrador creaba operarios a los que nadie podía
 * entrar. El identificador de acceso pasa a ser un código corto que él mismo escribe.
 */
describe('TK-173 (US-051): el codigo de operario es la identidad de acceso', () => {
  const secret = 'test-secret-key-operator-code-12345';
  let userRepo: InMemoryUserRepository;
  let adminToken: string;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    userRepo.seedUser(
      new User({
        id: 'usr-admin-1',
        operatorCode: 'ADM-01',
        name: 'Admin Seed',
        role: 'ADMIN',
        pin: Pin.createFromRaw('1234'),
        status: 'ACTIVE',
        failedAttempts: 0,
      })
    );
    adminToken = jwt.sign({ sub: 'usr-admin-1', name: 'Admin Seed', role: 'ADMIN' }, secret, { expiresIn: '1h' });
  });

  const createApp_ = () => createApp({ userRepository: userRepo, jwtSecret: secret });

  const altaOperario = (body: Record<string, unknown>) =>
    request(createApp_()).post('/api/v1/auth/users').set('Authorization', `Bearer ${adminToken}`).send(body);

  it('Escenario 1: el alta devuelve el codigo y el operario entra con el de inmediato', async () => {
    const alta = await altaOperario({ name: 'Carlos Gomez', operatorCode: 'CG-01', role: 'KITCHEN_STAFF', pin: '4321' });

    // ORACULO RED
    expect(alta.status).toBe(201);
    expect(alta.body.operatorCode).toBe('CG-01');

    const login = await request(createApp_()).post('/api/v1/auth/login-pin').send({ operatorCode: 'CG-01', pin: '4321' });

    // ORACULO RED: el codigo devuelto por el alta ES la credencial, sin consultar la BD
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body.user.name).toBe('Carlos Gomez');
  });

  it('Escenario 2: el listado de personal expone el codigo de cada operario', async () => {
    await altaOperario({ name: 'Carlos Gomez', operatorCode: 'CG-01', role: 'KITCHEN_STAFF', pin: '4321' });

    const lista = await request(createApp_()).get('/api/v1/auth/users').set('Authorization', `Bearer ${adminToken}`);

    expect(lista.status).toBe(200);
    expect(lista.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Carlos Gomez', operatorCode: 'CG-01' })])
    );
  });

  it('Escenario 3: un codigo ya en uso se rechaza con 409 RFC 7807 que nombra el conflicto', async () => {
    await altaOperario({ name: 'Carlos Gomez', operatorCode: 'CG-01', role: 'KITCHEN_STAFF', pin: '4321' });

    const duplicado = await altaOperario({ name: 'Carla Gil', operatorCode: 'CG-01', role: 'KITCHEN_STAFF', pin: '5555' });

    expect(duplicado.status).toBe(409);
    expect(duplicado.body).toMatchObject({ status: 409, type: expect.any(String), title: expect.any(String) });
    expect(duplicado.body.detail).toContain('CG-01');
  });

  it('Escenario 4: normaliza caja y espacios al persistir, y el login es insensible a la caja', async () => {
    const alta = await altaOperario({ name: 'Carlos Gomez', operatorCode: '  cg-01  ', role: 'KITCHEN_STAFF', pin: '4321' });

    expect(alta.status).toBe(201);
    expect(alta.body.operatorCode).toBe('CG-01');

    const login = await request(createApp_()).post('/api/v1/auth/login-pin').send({ operatorCode: ' cg-01 ', pin: '4321' });
    expect(login.status).toBe(200);
  });

  it('Escenario 4b: rechaza con 400 un codigo vacio, demasiado largo o con caracteres invalidos', async () => {
    for (const operatorCode of ['', 'A', 'DEMASIADO-LARGO-01', 'CG_01', 'CG 01']) {
      const res = await altaOperario({ name: 'X', operatorCode, role: 'KITCHEN_STAFF', pin: '4321' });
      expect(res.status, `codigo rechazado: "${operatorCode}"`).toBe(400);
    }
  });

  it('Escenario 5: un usuario preexistente sin codigo conserva acceso por su identificador actual', async () => {
    // Reproduce el relleno de la migracion: quien no traia codigo usa su `id`.
    userRepo.seedUser(
      new User({
        id: 'bootstrap-admin',
        name: 'Administrador',
        role: 'ADMIN',
        pin: Pin.createFromRaw('1234'),
        status: 'ACTIVE',
        failedAttempts: 0,
      })
    );

    const login = await request(createApp_()).post('/api/v1/auth/login-pin').send({ operatorCode: 'bootstrap-admin', pin: '1234' });

    expect(login.status).toBe(200);
    expect(login.body.user.name).toBe('Administrador');
  });
});
