import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { IEmailService, SendPasswordResetEmailDTO } from '../../domain/auth/ports/IEmailService.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  /** Exigir STARTTLS cuando `secure` es false. Solo se desactiva fuera de producción. */
  requireTLS: boolean;
  user?: string;
  pass?: string;
  from: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * AUDIT-DEV-018 D-1/D-4: sin `requireTLS`, nodemailer solo cifra si el servidor anuncia STARTTLS
 * (degradable por un atacante en la ruta); sin timeouts propios espera hasta 2 min / 30 s / 10 min,
 * demasiado para un envío que la petición no espera.
 */
export function buildSmtpTransportOptions(config: SmtpConfig): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure && config.requireTLS,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  };
}

/**
 * AUDIT-DEV-018 D-3: el `message` de nodemailer incluye la respuesta del servidor, que puede
 * contener el correo del destinatario. Solo se conservan los códigos.
 */
function sanitizedSmtpError(action: string, error: unknown): Error {
  const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown };
  return new Error(`${action} (code=${String(code ?? 'desconocido')}, responseCode=${String(responseCode ?? 'n/a')})`);
}

/**
 * Adaptador real de `IEmailService` sobre SMTP (TK-179 / INC-002). Hasta este ticket la única
 * implementación era `ConsoleEmailService`, así que el correo de recuperación nunca salía.
 * Nunca registra el token, el enlace ni la contraseña SMTP.
 */
export class SmtpEmailService implements IEmailService {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string
  ) {}

  public static fromConfig(config: SmtpConfig): SmtpEmailService {
    return new SmtpEmailService(nodemailer.createTransport(buildSmtpTransportOptions(config)), config.from);
  }

  public async sendPasswordResetEmail(dto: SendPasswordResetEmailDTO): Promise<void> {
    const name = escapeHtml(dto.recipientName);
    const url = escapeHtml(dto.resetUrl);
    await this.transporter
      .sendMail({
        from: this.from,
        to: dto.to,
        subject: 'RestoStock: recuperación de tu PIN de administrador',
        text:
          `Hola, ${dto.recipientName}:\n\n` +
          `Se ha solicitado restablecer tu PIN de administrador. Abre este enlace para elegir uno nuevo:\n\n${dto.resetUrl}\n\n` +
          `El enlace caduca en ${dto.expiresInMinutes} minutos y solo se puede usar una vez.\n` +
          'Si no lo has solicitado tú, ignora este correo: tu PIN no cambia.\n',
        html:
          `<p>Hola, ${name}:</p>` +
          '<p>Se ha solicitado restablecer tu PIN de administrador. Abre este enlace para elegir uno nuevo:</p>' +
          `<p><a href="${url}">Restablecer mi PIN</a></p>` +
          `<p>El enlace caduca en ${dto.expiresInMinutes} minutos y solo se puede usar una vez.</p>` +
          '<p>Si no lo has solicitado tú, ignora este correo: tu PIN no cambia.</p>',
      })
      .catch((error: unknown) => {
        throw sanitizedSmtpError('Envío SMTP fallido', error);
      });
  }

  /** Comprueba al arrancar que el servidor SMTP responde y acepta las credenciales. */
  public async verifyConnection(): Promise<void> {
    await this.transporter.verify().catch((error: unknown) => {
      throw sanitizedSmtpError('Verificación SMTP fallida', error);
    });
  }
}
