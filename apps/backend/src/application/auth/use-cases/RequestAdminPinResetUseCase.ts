import crypto from 'crypto';
import { IUserRepository } from '../../../domain/auth/repositories/IUserRepository.js';
import { IEmailService } from '../../../domain/auth/ports/IEmailService.js';

export interface RequestAdminPinResetDTO {
  email: string;
  clientOrigin?: string;
}

export interface RequestAdminPinResetResponseDTO {
  message: string;
}

export class RequestAdminPinResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService,
    /** Orígenes de frontend de confianza (el `CORS_ALLOWED_ORIGINS` resuelto). `['*']` = dev. */
    private readonly allowedOrigins: string[] = ['*']
  ) {}

  /**
   * AUDIT-SEC-004: NUNCA se usa `clientOrigin` (header `Origin`, atacante-controlable) tal cual
   * para construir el enlace del email — sería reset-poisoning. Prioridad: `CLIENT_ORIGIN` del
   * servidor → `clientOrigin` sólo si está en el allowlist → fallback de desarrollo.
   */
  private resolveResetOrigin(clientOrigin?: string): string {
    const configured = process.env.CLIENT_ORIGIN?.trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }
    if (clientOrigin && (this.allowedOrigins.includes('*') || this.allowedOrigins.includes(clientOrigin))) {
      return clientOrigin.replace(/\/+$/, '');
    }
    const firstConcrete = this.allowedOrigins.find((o) => o !== '*' && /^https?:\/\//.test(o));
    return firstConcrete ?? 'http://localhost:8085';
  }

  public async execute(dto: RequestAdminPinResetDTO): Promise<RequestAdminPinResetResponseDTO> {
    // No se normaliza aqui: IUserRepository.findByEmail ya normaliza (trim + lowercase)
    // en ambas implementaciones (InMemory y Prisma) — duplicarlo aqui era codigo muerto
    // en la practica (AUDIT-DEV-002): ningun input observable distinguia el codigo
    // normalizado del no-normalizado, porque el repositorio absorbe la diferencia.
    const user = await this.userRepository.findByEmail(dto.email);

    // Solo se permite reseteo por email a usuarios con rol ADMIN
    if (user && user.role === 'ADMIN') {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos exactos

      user.setResetToken(tokenHash, expiresAt);
      await this.userRepository.save(user);

      const resetUrl = `${this.resolveResetOrigin(dto.clientOrigin)}?resetToken=${rawToken}`;

      // TK-179 / INC-002: el envío no se espera. Con un servidor SMTP real, esperar haría que
      // un correo de ADMIN tardase cientos de ms más (o devolviera 500 si el servidor falla)
      // que uno inexistente, y eso enumera administradores. El fallo se registra sin el token.
      // `Promise.resolve().then` cubre también un adaptador que lance de forma síncrona.
      Promise.resolve()
        .then(() =>
          this.emailService.sendPasswordResetEmail({
            to: user.email ?? dto.email,
            recipientName: user.name,
            resetToken: rawToken,
            resetUrl,
            expiresInMinutes: 15,
          })
        )
        .catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`[RequestAdminPinResetUseCase] No se pudo enviar el correo de recuperación al usuario ${user.id}: ${reason}`);
        });
    }

    // Respuesta generica constante para mitigar User Enumeration (OWASP Top 10)
    return {
      message: 'Si el correo coincide con un administrador registrado, se enviaron instrucciones de recuperación.',
    };
  }
}
