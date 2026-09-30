import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CSRF_HEADER, SESSION_COOKIE, isValidCsrfToken, readCookie } from '../sessionCookies.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    name: string;
    role: string;
    /**
     * TK-121 (US-015 Esc. 2): lista de permisos del rol al momento de emitir el token.
     * Opcional — los tokens anteriores a TK-121 no la traen. **Ninguna decisión de
     * autorización debe leerse de aquí**: `authorizePermissions` consulta el
     * repositorio en vivo para que una revocación surta efecto de inmediato, sin
     * esperar a que expire el token. Este campo existe solo para que el cliente sepa
     * qué ofrecer.
     */
    permissions?: string[];
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * TK-140 / ADR-005: el navegador se autentica con la cookie `httpOnly` de sesión. Como el
 * navegador la adjunta solo, toda mutación que llegue por cookie debe traer además el token
 * CSRF de esa sesión en `X-CSRF-Token`.
 *
 * `Authorization: Bearer` se sigue aceptando para clientes que no son navegador (scripts,
 * pruebas, un futuro cliente nativo — consecuencia registrada en ADR-005) y para las sesiones
 * que el SPA abrió antes de TK-140. No necesita CSRF: esa cabecera nunca la añade el navegador
 * por su cuenta, así que un sitio ajeno no puede forjarla.
 */
function resolveSessionToken(req: Request): { token: string; viaCookie: boolean } | null {
  const cookieToken = readCookie(req, SESSION_COOKIE);
  if (cookieToken) return { token: cookieToken, viaCookie: true };
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return { token: authHeader.split(' ')[1], viaCookie: false };
  return null;
}

export function createAuthenticateJWTMiddleware(jwtSecret: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const session = resolveSessionToken(req);

    if (!session) {
      res.status(401).json({
        type: 'https://restostock.com/errors/unauthorized',
        title: 'UnauthorizedException',
        status: 401,
        detail: 'Acceso no autorizado. Inicie sesion: falta la cookie de sesion o un token Bearer JWT valido.',
        instance: req.originalUrl || req.url,
      });
      return;
    }

    const { token, viaCookie } = session;

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        sub: string;
        name: string;
        role: string;
      };
      if (viaCookie && !SAFE_METHODS.has(req.method) && !isValidCsrfToken(token, jwtSecret, req.header(CSRF_HEADER))) {
        res.status(403).json({
          type: 'https://restostock.com/errors/csrf-token-mismatch',
          title: 'CsrfTokenMismatchException',
          status: 403,
          detail: 'Falta el token CSRF de la sesion o no corresponde a ella. Recargue la pagina e intente de nuevo.',
          instance: req.originalUrl || req.url,
        });
        return;
      }
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({
        type: 'https://restostock.com/errors/invalid-token',
        title: 'InvalidTokenException',
        status: 401,
        detail: 'El token de autenticacion proporcionado es invalido o ha expirado.',
        instance: req.originalUrl || req.url,
      });
    }
  };
}
