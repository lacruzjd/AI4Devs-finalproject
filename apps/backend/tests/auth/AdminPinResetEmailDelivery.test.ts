/**
 * INC-002 — El correo de recuperación de PIN nunca se enviaba.
 *
 * Feature: Reproducción de la incidencia INC-002
 *
 *   Scenario: Con SMTP configurado, la recuperación de PIN entrega un correo real al ADMIN
 *     Given un entorno con SMTP_HOST, SMTP_PORT y SMTP_FROM apuntando a un servidor SMTP
 *     And un ADMIN bloqueado por intentos fallidos con correo "admin@restostock.test"
 *     When se compone el backend desde ese entorno y se envía POST /api/v1/auth/forgot-pin
 *     Then el servidor SMTP recibe un mensaje para "admin@restostock.test"
 *     And el mensaje contiene el enlace de recuperación con su token
 *
 *   Scenario: Con TLS obligatorio (por defecto), un servidor sin STARTTLS no recibe nada
 *     Given el mismo servidor SMTP, que no ofrece STARTTLS, y SMTP_REQUIRE_TLS sin definir
 *     When se envía POST /api/v1/auth/forgot-pin
 *     And credenciales SMTP configuradas
 *     Then el servidor no recibe ni AUTH ni MAIL ni mensaje (AUDIT-DEV-018 D-1)
 *     And el fallo se registra con su código, sin el token
 *
 *   Scenario: Sin SMTP configurado se mantiene el adaptador de consola
 *     Given un entorno sin SMTP_HOST
 *     When se compone el servicio de correo desde ese entorno
 *     Then no se inyecta ningún servicio de correo real
 *
 * Los tests anteriores (TK-077) usaban ConsoleEmailService, así que comprobaban que se
 * llamaba a enviar, no que el correo saliera. Este test habla SMTP de verdad con un
 * servidor mínimo levantado en el propio test.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import net from 'node:net';
import request from 'supertest';
import { createApp } from '../../src/infrastructure/http/app.js';
import { buildEmailServiceForEnvironment } from '../../src/infrastructure/http/composition.js';
import { getEnvironment } from '../../src/infrastructure/config/environment.js';
import { InMemoryUserRepository } from '../../src/infrastructure/auth/repositories/InMemoryUserRepository.js';
import { User } from '../../src/domain/auth/entities/User.js';
import { Pin } from '../../src/domain/auth/value-objects/Pin.js';

interface ReceivedMail {
  from: string;
  to: string[];
  data: string;
}

/** Servidor SMTP mínimo sin TLS ni AUTH: acepta mensajes y los guarda en memoria. */
function startSmtpSink(received: ReceivedMail[], commands: string[]): Promise<net.Server> {
  const server = net.createServer((socket) => {
    let current: ReceivedMail = { from: '', to: [], data: '' };
    let inData = false;
    let buffer = '';
    socket.write('220 sink ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index: number;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            received.push(current);
            current = { from: '', to: [], data: '' };
            socket.write('250 OK\r\n');
          } else {
            current.data += `${line.startsWith('..') ? line.slice(1) : line}\n`;
          }
          continue;
        }
        const command = line.toUpperCase();
        commands.push(command.split(' ')[0]);
        if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250 sink\r\n');
        else if (command.startsWith('MAIL FROM:')) {
          current.from = line.slice(10).trim();
          socket.write('250 OK\r\n');
        } else if (command.startsWith('RCPT TO:')) {
          current.to.push(line.slice(8).trim());
          socket.write('250 OK\r\n');
        } else if (command === 'DATA') {
          inData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (command === 'QUIT') {
          socket.end('221 Bye\r\n');
        } else if (command === 'RSET' || command === 'NOOP') socket.write('250 OK\r\n');
        // Como un servidor real: lo no implementado (STARTTLS incluido) responde 502.
        else socket.write('502 5.5.1 Command not implemented\r\n');
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

describe('INC-002: el correo de recuperación de PIN llega por SMTP real', () => {
  const received: ReceivedMail[] = [];
  /** Verbo de cada comando SMTP recibido, para comprobar qué llegó a enviarse. */
  const commands: string[] = [];
  let smtpServer: net.Server;
  let smtpPort: number;

  beforeAll(async () => {
    smtpServer = await startSmtpSink(received, commands);
    smtpPort = (smtpServer.address() as net.AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => smtpServer.close(() => resolve()));
  });

  const baseEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'test-secret-key-inc-002-regression',
    // AUDIT-DEV-018 D-2: con SMTP activo el origen del enlace debe ser concreto.
    CORS_ALLOWED_ORIGINS: 'https://app.restostock.test',
  };

  function buildAppWithBlockedAdmin(emailService: ReturnType<typeof buildEmailServiceForEnvironment>, jwtSecret: string) {
    const userRepo = new InMemoryUserRepository();
    userRepo.seedUser(
      new User({
        id: 'usr-admin-inc-002',
        name: 'USER_SYNTHETIC_001',
        role: 'ADMIN',
        pin: Pin.createFromRaw('1234'),
        email: 'admin@restostock.test',
        status: 'BLOCKED',
        failedAttempts: 5,
      })
    );
    return createApp({ userRepository: userRepo, emailService, jwtSecret, corsAllowedOrigins: 'https://app.restostock.test' });
  }

  afterEach(() => {
    received.length = 0;
    commands.length = 0;
    vi.restoreAllMocks();
  });

  it('entrega el enlace de recuperación al ADMIN bloqueado a través del servidor SMTP configurado', async () => {
    const env = getEnvironment({
      ...baseEnv,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_FROM: 'RestoStock <no-reply@restostock.test>',
      // El servidor de pruebas no ofrece TLS; fuera de producción se permite desactivarlo.
      SMTP_REQUIRE_TLS: 'false',
    });
    const app = buildAppWithBlockedAdmin(buildEmailServiceForEnvironment(env), env.JWT_SECRET);


    const response = await request(app).post('/api/v1/auth/forgot-pin').send({ email: 'admin@restostock.test' });

    // ORACULO RED: la respuesta sigue siendo la genérica anti-enumeración
    expect(response.status).toBe(200);

    // ORACULO ESTADO: el servidor SMTP recibió exactamente un mensaje para el ADMIN. El envío
    // no se espera en la petición (anti-enumeración por tiempo), así que se espera aquí.
    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0].to).toEqual(['<admin@restostock.test>']);
    expect(received[0].from).toBe('<no-reply@restostock.test>');
    const decoded = received[0].data.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    expect(decoded).toMatch(/https:\/\/app\.restostock\.test\?resetToken=[0-9a-f]{64}/);
  });

  it('AUDIT-DEV-018 D-1: con TLS obligatorio no entrega nada a un servidor que no ofrece STARTTLS', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const env = getEnvironment({
      ...baseEnv,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_FROM: 'RestoStock <no-reply@restostock.test>',
      SMTP_USER: 'USER_SYNTHETIC_001',
      SMTP_PASS: 'YOUR_KEY_HERE',
    });
    const app = buildAppWithBlockedAdmin(buildEmailServiceForEnvironment(env), env.JWT_SECRET);

    const response = await request(app).post('/api/v1/auth/forgot-pin').send({ email: 'admin@restostock.test' });

    // ORACULO RED: la respuesta genérica no delata el fallo
    expect(response.status).toBe(200);
    // ORACULO ESTADO: el fallo queda registrado con su código y el servidor no recibió nada
    await vi.waitFor(() => expect(errorLog).toHaveBeenCalledTimes(1));
    expect(errorLog.mock.calls[0].join(' ')).toMatch(/code=ETLS/);
    expect(received).toHaveLength(0);
    // ORACULO RED: el cliente pidió STARTTLS y, rechazado, no envió credenciales ni sobre
    expect(commands).toContain('STARTTLS');
    expect(commands).not.toContain('AUTH');
    expect(commands).not.toContain('MAIL');
  });

  it('no inyecta ningún servicio de correo real cuando SMTP_HOST no está definido', () => {
    const env = getEnvironment(baseEnv);

    expect(buildEmailServiceForEnvironment(env)).toBeUndefined();
  });
});
