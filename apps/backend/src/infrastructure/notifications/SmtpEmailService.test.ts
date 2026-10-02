import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';
import { SmtpEmailService, SmtpConfig, buildSmtpTransportOptions } from './SmtpEmailService.js';
import { SendPasswordResetEmailDTO } from '../../domain/auth/ports/IEmailService.js';

const DTO: SendPasswordResetEmailDTO = {
  to: 'admin@restostock.test',
  recipientName: 'USER_SYNTHETIC_001 <script>',
  resetToken: 'a'.repeat(64),
  resetUrl: `https://app.restostock.test?resetToken=${'a'.repeat(64)}`,
  expiresInMinutes: 15,
};

interface CapturedMail {
  raw: string;
  subject: string;
  html: string;
}

/** Transporte de nodemailer que construye el mensaje MIME real y lo guarda en vez de enviarlo. */
function capturingTransport(captured: CapturedMail[]) {
  return nodemailer.createTransport({
    name: 'capture',
    version: '1.0.0',
    send: (mail, callback) => {
      mail.message.build((error, message) => {
        if (error) return callback(error, undefined as never);
        captured.push({ raw: message.toString('utf8'), subject: String(mail.data.subject), html: String(mail.data.html) });
        callback(null, { envelope: mail.message.getEnvelope(), messageId: mail.message.messageId() } as never);
      });
    },
  });
}

/** Decodifica quoted-printable lo justo para leer el cuerpo del mensaje. */
function decode(raw: string): string {
  return raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

describe('TK-179: SmtpEmailService', () => {
  it('construye el correo de recuperación con remitente, destinatario, enlace y caducidad', async () => {
    const captured: CapturedMail[] = [];
    const service = new SmtpEmailService(capturingTransport(captured), 'RestoStock <no-reply@restostock.test>');

    await service.sendPasswordResetEmail(DTO);

    expect(captured).toHaveLength(1);
    const message = decode(captured[0].raw);
    expect(message).toMatch(/^From: RestoStock <no-reply@restostock\.test>/m);
    expect(message).toMatch(/^To: admin@restostock\.test/m);
    expect(captured[0].subject).toContain('PIN');
    expect(message).toContain(DTO.resetUrl);
    expect(message).toContain('15 minutos');
  });

  it('escapa el nombre del destinatario en la parte HTML', async () => {
    const captured: CapturedMail[] = [];
    const service = new SmtpEmailService(capturingTransport(captured), 'no-reply@restostock.test');

    await service.sendPasswordResetEmail(DTO);

    expect(captured[0].html).toContain('USER_SYNTHETIC_001 &lt;script&gt;');
    expect(captured[0].html).not.toContain('<script>');
  });

  it('escapa también el enlace dentro del atributo href', async () => {
    const captured: CapturedMail[] = [];
    const service = new SmtpEmailService(capturingTransport(captured), 'no-reply@restostock.test');

    await service.sendPasswordResetEmail({ ...DTO, resetUrl: 'https://app.restostock.test?resetToken=x"><img src=y>' });

    expect(captured[0].html).toContain('href="https://app.restostock.test?resetToken=x&quot;&gt;&lt;img src=y&gt;"');
  });

  it('AUDIT-DEV-018 D-3: sustituye el mensaje del servidor por su código para no volcar correos a los logs', async () => {
    const rejected = Object.assign(new Error('Can\'t send mail - all recipients were rejected: 550 5.1.1 <admin@restostock.test>: Recipient address rejected'), {
      code: 'EENVELOPE',
      responseCode: 550,
    });
    const failing = nodemailer.createTransport({
      name: 'failing',
      version: '1.0.0',
      send: (_mail, callback) => callback(rejected, undefined as never),
    });
    const service = new SmtpEmailService(failing, 'no-reply@restostock.test');

    const error = await service.sendPasswordResetEmail(DTO).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Envío SMTP fallido (code=EENVELOPE, responseCode=550)');
  });

  describe('verifyConnection', () => {
    function verifyingTransport(outcome: Error | null) {
      let calls = 0;
      const transporter = nodemailer.createTransport({
        name: 'verifying',
        version: '1.0.0',
        send: (_mail: unknown, callback: (error: Error | null) => void) => callback(null),
        verify: async () => {
          calls += 1;
          if (outcome) throw outcome;
          return true;
        },
      } as never);
      return { transporter, calls: () => calls };
    }

    it('resuelve cuando el transporte confirma la conexión', async () => {
      const { transporter, calls } = verifyingTransport(null);

      await new SmtpEmailService(transporter, 'no-reply@restostock.test').verifyConnection();

      expect(calls()).toBe(1);
    });

    it('rechaza con un error saneado cuando el servidor rechaza las credenciales', async () => {
      const authError = Object.assign(new Error('Invalid login: 535 5.7.8 <USER_SYNTHETIC_001@restostock.test> rejected'), { code: 'EAUTH', responseCode: 535 });
      const { transporter } = verifyingTransport(authError);

      await expect(new SmtpEmailService(transporter, 'no-reply@restostock.test').verifyConnection()).rejects.toThrow(
        'Verificación SMTP fallida (code=EAUTH, responseCode=535)'
      );
    });
  });
});

describe('AUDIT-DEV-018: buildSmtpTransportOptions', () => {
  const BASE: SmtpConfig = { host: 'smtp.example.com', port: 587, secure: false, requireTLS: true, from: 'no-reply@example.com' };

  it('D-1: exige STARTTLS cuando la conexión no usa TLS implícito', () => {
    expect(buildSmtpTransportOptions(BASE).requireTLS).toBe(true);
  });

  it('D-1: no exige STARTTLS sobre TLS implícito (465), donde ya va cifrado', () => {
    expect(buildSmtpTransportOptions({ ...BASE, port: 465, secure: true }).requireTLS).toBe(false);
  });

  it('D-1: permite desactivarlo de forma explícita (servidor de pruebas sin TLS)', () => {
    expect(buildSmtpTransportOptions({ ...BASE, requireTLS: false }).requireTLS).toBe(false);
  });

  it('D-4: fija timeouts explícitos en lugar de los de nodemailer (2 min / 30 s / 10 min)', () => {
    const options = buildSmtpTransportOptions(BASE);
    expect(options.connectionTimeout).toBe(10_000);
    expect(options.greetingTimeout).toBe(10_000);
    expect(options.socketTimeout).toBe(30_000);
  });

  it('solo envía credenciales cuando hay usuario y contraseña', () => {
    expect(buildSmtpTransportOptions(BASE).auth).toBeUndefined();
    expect(buildSmtpTransportOptions({ ...BASE, user: 'USER_SYNTHETIC_001', pass: 'YOUR_KEY_HERE' }).auth).toEqual({
      user: 'USER_SYNTHETIC_001',
      pass: 'YOUR_KEY_HERE',
    });
  });
});
