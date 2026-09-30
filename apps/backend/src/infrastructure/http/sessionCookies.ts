import crypto from 'crypto';
import { Request, Response } from 'express';
import { SESSION_TTL_SECONDS } from '../../application/auth/use-cases/AuthenticateByPinUseCase.js';

/**
 * TK-140 / ADR-005: la sesión del navegador viaja en una cookie `httpOnly` que ningún script
 * puede leer. SPA y API comparten origen detrás de nginx, así que no hay CORS que negociar.
 */
export const SESSION_COOKIE = 'restostock_session';
/** Token CSRF legible por el SPA, que lo devuelve en `X-CSRF-Token` en cada mutación. */
const CSRF_COOKIE = 'restostock_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SESSION_PATH = '/api';
const CSRF_PATH = '/';

/**
 * El token CSRF es un HMAC del token de sesión: queda ligado a esa sesión sin estado en el
 * servidor, y un atacante que no puede leer la cookie `httpOnly` tampoco puede calcularlo.
 */
function csrfTokenFor(sessionToken: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`csrf:${sessionToken}`).digest('base64url');
}

export function isValidCsrfToken(sessionToken: string, secret: string, candidate: string | undefined): boolean {
  if (!candidate) return false;
  const expected = Buffer.from(csrfTokenFor(sessionToken, secret));
  const received = Buffer.from(candidate);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/** Lee una cookie de la cabecera `Cookie` sin depender de `cookie-parser`. */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export function setSessionCookies(res: Response, sessionToken: string, secret: string, secure: boolean): void {
  const common = { sameSite: 'strict' as const, secure, maxAge: SESSION_TTL_SECONDS * 1000 };
  res.cookie(SESSION_COOKIE, sessionToken, { ...common, httpOnly: true, path: SESSION_PATH });
  res.cookie(CSRF_COOKIE, csrfTokenFor(sessionToken, secret), { ...common, httpOnly: false, path: CSRF_PATH });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, { sameSite: 'strict', secure, httpOnly: true, path: SESSION_PATH });
  res.clearCookie(CSRF_COOKIE, { sameSite: 'strict', secure, path: CSRF_PATH });
}
