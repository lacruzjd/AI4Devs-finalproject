import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEnvironment } from './environment.js';

const PROD_BASE = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/restostock?schema=public',
  JWT_SECRET: 'a-real-production-jwt-secret-of-32-plus-chars',
  CORS_ALLOWED_ORIGINS: 'https://app.restostock.com',
  CLIENT_ORIGIN: 'https://app.restostock.com',
  ENCRYPTION_KEY: 'a-dedicated-encryption-key-distinct-from-jwt',
};

describe('AUDIT-SEC-004: fail-fast de ENCRYPTION_KEY y CLIENT_ORIGIN en producción', () => {
  it('acepta una config de producción completa y coherente', () => {
    expect(() => getEnvironment(PROD_BASE)).not.toThrow();
  });

  it('ABORTA si falta ENCRYPTION_KEY en producción', () => {
    const env = { ...PROD_BASE, ENCRYPTION_KEY: undefined };
    expect(() => getEnvironment(env)).toThrow(/ENCRYPTION_KEY/);
  });

  it('ABORTA si ENCRYPTION_KEY es igual a JWT_SECRET (reutilización de clave)', () => {
    expect(() => getEnvironment({ ...PROD_BASE, ENCRYPTION_KEY: PROD_BASE.JWT_SECRET })).toThrow(/independientes|JWT_SECRET/);
  });

  it('no exige CLIENT_ORIGIN si CORS_ALLOWED_ORIGINS es un allowlist concreto', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CLIENT_ORIGIN: undefined })).not.toThrow();
  });

  it('trata CLIENT_ORIGIN vacío (docker-compose ${VAR:-}) como ausente, no como URL inválida', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CLIENT_ORIGIN: '' })).not.toThrow();
  });

  it('trata ENCRYPTION_KEY vacío como ausente → aborta por obligatorio, no por longitud', () => {
    expect(() => getEnvironment({ ...PROD_BASE, ENCRYPTION_KEY: '' })).toThrow(/ENCRYPTION_KEY es obligatorio/);
  });

  it('en desarrollo no exige ENCRYPTION_KEY', () => {
    expect(() =>
      getEnvironment({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://u:p@localhost:5432/dev?schema=public',
        JWT_SECRET: 'dev-secret-16-chars-min',
      })
    ).not.toThrow();
  });
});

describe('TK-145: CORS_ALLOWED_ORIGINS se valida como lista de orígenes con esquema', () => {
  it('Escenario 1: acepta una lista de orígenes https separada por comas y con espacios', () => {
    const env = getEnvironment({
      ...PROD_BASE,
      CORS_ALLOWED_ORIGINS: 'https://app.example.com, https://admin.example.com',
    });
    expect(env.CORS_ALLOWED_ORIGINS).toBe('https://app.example.com, https://admin.example.com');
  });

  it('acepta orígenes http con puerto (valores locales de .env)', () => {
    expect(() =>
      getEnvironment({
        ...PROD_BASE,
        CORS_ALLOWED_ORIGINS: 'http://localhost,http://localhost:8080,http://localhost:5173',
      })
    ).not.toThrow();
  });

  it('Escenario 2: ABORTA con un hostname sin esquema y nombra la variable y el valor', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: 'app.example.com' })).toThrow(
      /CORS_ALLOWED_ORIGINS[\s\S]*app\.example\.com/
    );
  });

  it('ABORTA si un solo elemento de la lista es inválido', () => {
    expect(() =>
      getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: 'https://app.example.com,admin.example.com' })
    ).toThrow(/admin\.example\.com/);
  });

  it('ABORTA con un esquema que no es http ni https', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: 'ftp://app.example.com' })).toThrow(
      /CORS_ALLOWED_ORIGINS/
    );
  });

  it('ABORTA con una ruta o una barra final (el header Origin nunca las lleva)', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: 'https://app.example.com/' })).toThrow(
      /CORS_ALLOWED_ORIGINS/
    );
    expect(() => getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: 'https://app.example.com/app' })).toThrow(
      /CORS_ALLOWED_ORIGINS/
    );
  });

  it('Escenario 3: en desarrollo sin definir usa el comodín por defecto', () => {
    const env = getEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/dev?schema=public',
      JWT_SECRET: 'dev-secret-16-chars-min',
    });
    expect(env.CORS_ALLOWED_ORIGINS).toBe('*');
  });

  it('trata el valor vacío (docker-compose sin la variable) como ausente → en producción aborta por comodín', () => {
    expect(() => getEnvironment({ ...PROD_BASE, CORS_ALLOWED_ORIGINS: '' })).toThrow(/comodin/);
  });
});

describe('TK-179 / INC-002: configuración SMTP del correo de recuperación de PIN', () => {
  const DEV_BASE = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/restostock',
    JWT_SECRET: 'a-development-jwt-secret-16plus',
  };

  it('Escenario 2: sin SMTP_HOST el resto de variables SMTP son opcionales', () => {
    const env = getEnvironment(DEV_BASE);
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
    expect(env.SMTP_SECURE).toBe(false);
  });

  it('acepta una configuración SMTP completa con TLS implícito y credenciales', () => {
    const env = getEnvironment({
      ...PROD_BASE,
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'USER_SYNTHETIC_001',
      SMTP_PASS: 'YOUR_KEY_HERE',
      SMTP_FROM: 'RestoStock <no-reply@example.com>',
    });
    expect(env.SMTP_PORT).toBe(465);
    expect(env.SMTP_SECURE).toBe(true);
  });

  it('Escenario 3: ABORTA si hay SMTP_HOST sin SMTP_FROM', () => {
    expect(() => getEnvironment({ ...DEV_BASE, SMTP_HOST: 'smtp.example.com' })).toThrow(/SMTP_FROM/);
  });

  it('Escenario 3: ABORTA si SMTP_USER llega sin SMTP_PASS', () => {
    expect(() =>
      getEnvironment({ ...DEV_BASE, SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com', SMTP_USER: 'USER_SYNTHETIC_001' })
    ).toThrow(/SMTP_PASS/);
  });

  it('Escenario 3: ABORTA si SMTP_PASS llega sin SMTP_USER', () => {
    expect(() =>
      getEnvironment({ ...DEV_BASE, SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com', SMTP_PASS: 'YOUR_KEY_HERE' })
    ).toThrow(/SMTP_USER/);
  });

  it('ABORTA si SMTP_SECURE no es "true" ni "false"', () => {
    expect(() =>
      getEnvironment({ ...DEV_BASE, SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com', SMTP_SECURE: 'yes' })
    ).toThrow(/SMTP_SECURE/);
  });

  it('trata las variables SMTP vacías (docker-compose ${VAR:-}) como ausentes', () => {
    const env = getEnvironment({ ...DEV_BASE, SMTP_HOST: '', SMTP_PORT: '', SMTP_SECURE: '', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '' });
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
  });
});

describe('AUDIT-DEV-018: endurecimiento de la configuración SMTP (TK-179)', () => {
  const DEV_SMTP = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/restostock',
    JWT_SECRET: 'a-development-jwt-secret-16plus',
    CLIENT_ORIGIN: 'https://app.example.com',
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'no-reply@example.com',
  };
  const PROD_SMTP = { ...PROD_BASE, SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com' };
  const without = (key: keyof typeof DEV_SMTP) => Object.fromEntries(Object.entries(DEV_SMTP).filter(([name]) => name !== key));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('D-1: SMTP_REQUIRE_TLS vale true por defecto', () => {
    expect(getEnvironment(DEV_SMTP).SMTP_REQUIRE_TLS).toBe(true);
  });

  it('D-1: permite SMTP_REQUIRE_TLS=false fuera de producción (servidor SMTP local de pruebas)', () => {
    expect(getEnvironment({ ...DEV_SMTP, SMTP_REQUIRE_TLS: 'false' }).SMTP_REQUIRE_TLS).toBe(false);
  });

  it('D-1: ABORTA en producción si SMTP_REQUIRE_TLS=false con SMTP_HOST definido', () => {
    expect(() => getEnvironment({ ...PROD_SMTP, SMTP_REQUIRE_TLS: 'false' })).toThrow(/SMTP_REQUIRE_TLS/);
  });

  it('D-2: ABORTA si hay SMTP_HOST con CORS comodín y sin CLIENT_ORIGIN (enlace de reset envenenable)', () => {
    expect(() => getEnvironment(without('CLIENT_ORIGIN'))).toThrow(/CLIENT_ORIGIN/);
  });

  it('D-2: acepta SMTP_HOST con CORS concreto aunque no haya CLIENT_ORIGIN', () => {
    expect(() => getEnvironment({ ...without('CLIENT_ORIGIN'), CORS_ALLOWED_ORIGINS: 'https://app.example.com' })).not.toThrow();
  });

  it('D-6: ABORTA con un SMTP_PORT fuera de 1-65535', () => {
    expect(() => getEnvironment({ ...DEV_SMTP, SMTP_PORT: '0' })).toThrow(/SMTP_PORT/);
    expect(() => getEnvironment({ ...DEV_SMTP, SMTP_PORT: '70000' })).toThrow(/SMTP_PORT/);
  });

  it('D-6: avisa (sin abortar) de 465 sin TLS implícito y de 587 con TLS implícito', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getEnvironment({ ...DEV_SMTP, SMTP_PORT: '465', SMTP_SECURE: 'false' });
    getEnvironment({ ...DEV_SMTP, SMTP_PORT: '587', SMTP_SECURE: 'true' });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/SMTP_SECURE/);
  });

  it('D-6: avisa de que las variables SMTP se ignoran sin SMTP_HOST', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getEnvironment(without('SMTP_HOST'));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/SMTP_HOST/);
  });

  it('no avisa con una configuración coherente', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getEnvironment({ ...DEV_SMTP, SMTP_PORT: '465', SMTP_SECURE: 'true' });
    expect(warn).not.toHaveBeenCalled();
  });
});
