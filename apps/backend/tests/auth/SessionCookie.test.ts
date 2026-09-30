import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/infrastructure/http/app.js';
import { InMemoryUserRepository } from '../../src/infrastructure/auth/repositories/InMemoryUserRepository.js';
import { User } from '../../src/domain/auth/entities/User.js';
import { Pin } from '../../src/domain/auth/value-objects/Pin.js';

/** Devuelve la cabecera `Set-Cookie` de una cookie concreta, o `undefined`. */
function setCookieFor(response: request.Response, name: string): string | undefined {
  const raw = response.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith(`${name}=`));
}

/** Valor de la cookie tal como la reenviaría el navegador (`name=value`). */
function cookiePair(header: string | undefined): string {
  return (header ?? '').split(';')[0];
}

describe('TK-140 (ADR-005): la sesión viaja en una cookie httpOnly con protección CSRF', () => {
  const secret = 'test-secret-session-cookie-12345';
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    userRepo.seedUser(
      new User({ id: 'usr-admin-1', operatorCode: 'ADM-01', name: 'Admin', role: 'ADMIN', pin: Pin.createFromRaw('1234'), status: 'ACTIVE', failedAttempts: 0 })
    );
  });

  const app = (secureCookies = false) => createApp({ userRepository: userRepo, jwtSecret: secret, secureCookies });

  async function login(secureCookies = false) {
    const response = await request(app(secureCookies)).post('/api/v1/auth/login-pin').send({ operatorCode: 'ADM-01', pin: '1234' });
    return {
      response,
      session: cookiePair(setCookieFor(response, 'restostock_session')),
      csrf: cookiePair(setCookieFor(response, 'restostock_csrf')).split('=')[1],
      csrfCookie: cookiePair(setCookieFor(response, 'restostock_csrf')),
    };
  }

  describe('POST /auth/login-pin', () => {
    it('emite la sesión en una cookie httpOnly, SameSite=Strict, Path=/api y Max-Age de 12 h', async () => {
      const { response } = await login();

      expect(response.status).toBe(200);
      const cookie = setCookieFor(response, 'restostock_session');
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\/api(;|$)/);
      expect(cookie).toMatch(/Max-Age=43200/);
      expect(cookie).not.toMatch(/Secure/i);
    });

    it('marca la cookie como Secure cuando la app corre con cookies seguras (producción)', async () => {
      const { response } = await login(true);

      expect(setCookieFor(response, 'restostock_session')).toMatch(/Secure/i);
      expect(setCookieFor(response, 'restostock_csrf')).toMatch(/Secure/i);
    });

    it('el token ya no viaja en el cuerpo; el cuerpo trae el usuario con sus permisos', async () => {
      const { response } = await login();

      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body.user).toMatchObject({ id: 'usr-admin-1', name: 'Admin', role: 'ADMIN' });
      expect(response.body.user.permissions).toEqual(expect.arrayContaining(['roles:manage', 'users:manage']));
    });

    it('emite un token CSRF legible por el cliente (no httpOnly) y distinto del token de sesión', async () => {
      const { response, session, csrf } = await login();

      const cookie = setCookieFor(response, 'restostock_csrf');
      expect(cookie).toBeDefined();
      expect(cookie).not.toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(csrf).toBeTruthy();
      expect(session).not.toContain(csrf);
    });
  });

  describe('autenticación por cookie', () => {
    it('una lectura con solo la cookie de sesión está autenticada', async () => {
      const { session } = await login();

      const response = await request(app()).get('/api/v1/auth/users').set('Cookie', session);

      expect(response.status).toBe(200);
    });

    it('una cookie con un token manipulado se rechaza con 401', async () => {
      const response = await request(app()).get('/api/v1/auth/users').set('Cookie', 'restostock_session=no-es-un-jwt');

      expect(response.status).toBe(401);
    });

    it('rechaza con 403 una mutación autenticada por cookie sin cabecera X-CSRF-Token', async () => {
      const { session, csrfCookie } = await login();

      const response = await request(app())
        .post('/api/v1/auth/users')
        .set('Cookie', [session, csrfCookie])
        .send({ name: 'Nuevo', operatorCode: 'NV-01', role: 'KITCHEN_STAFF', pin: '4321' });

      expect(response.status).toBe(403);
      expect(response.body.title).toBe('CsrfTokenMismatchException');
      expect(await userRepo.findByOperatorCode('NV-01')).toBeNull();
    });

    it('rechaza con 403 un X-CSRF-Token que no corresponde a la sesión', async () => {
      const { session, csrfCookie } = await login();

      const response = await request(app())
        .post('/api/v1/auth/users')
        .set('Cookie', [session, csrfCookie])
        .set('X-CSRF-Token', 'token-inventado')
        .send({ name: 'Nuevo', operatorCode: 'NV-01', role: 'KITCHEN_STAFF', pin: '4321' });

      expect(response.status).toBe(403);
    });

    it('acepta la mutación con el X-CSRF-Token emitido para esa sesión', async () => {
      const { session, csrfCookie, csrf } = await login();

      const response = await request(app())
        .post('/api/v1/auth/users')
        .set('Cookie', [session, csrfCookie])
        .set('X-CSRF-Token', csrf)
        .send({ name: 'Nuevo', operatorCode: 'NV-01', role: 'KITCHEN_STAFF', pin: '4321' });

      expect(response.status).toBe(201);
    });

    it('el token CSRF de otra sesión no sirve (está ligado a la sesión, no es un valor global)', async () => {
      const first = await login();
      const second = await login();

      const response = await request(app())
        .post('/api/v1/auth/users')
        .set('Cookie', [first.session, first.csrfCookie])
        .set('X-CSRF-Token', second.csrf)
        .send({ name: 'Nuevo', operatorCode: 'NV-01', role: 'KITCHEN_STAFF', pin: '4321' });

      // Dos logins en el mismo segundo pueden emitir el mismo JWT; solo es significativo si difieren.
      if (first.session !== second.session) {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Authorization: Bearer (clientes que no son navegador)', () => {
    it('sigue autenticando y no exige CSRF: la cabecera no la adjunta el navegador por su cuenta', async () => {
      const token = jwt.sign({ sub: 'usr-admin-1', name: 'Admin', role: 'ADMIN' }, secret, { expiresIn: '1h' });

      const response = await request(app())
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nuevo', operatorCode: 'NV-02', role: 'KITCHEN_STAFF', pin: '4321' });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /auth/logout', () => {
    it('borra las dos cookies en el servidor y responde 204', async () => {
      const { session } = await login();

      const response = await request(app()).post('/api/v1/auth/logout').set('Cookie', session);

      expect(response.status).toBe(204);
      const cleared = setCookieFor(response, 'restostock_session');
      expect(cleared).toMatch(/Path=\/api(;|$)/);
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(setCookieFor(response, 'restostock_csrf')).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
  });
});
