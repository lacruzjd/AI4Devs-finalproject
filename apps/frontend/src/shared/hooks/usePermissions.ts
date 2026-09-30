import { AuthService } from '../../features/auth/services/auth.service.js';

/**
 * Permisos que, antes de `TK-121`, gateaban superficie exclusiva de `ADMIN`
 * (`AppNav.adminOnly` y `ProtectedRoute requiredRole="ADMIN"`). Solo se usan en la
 * ruta de compatibilidad para tokens sin `permissions`: reproducen exactamente el
 * comportamiento anterior, ni más ni menos.
 */
const LEGACY_ADMIN_ONLY_CODES = new Set(['reports:view', 'roles:manage', 'users:manage']);

interface TokenPayload {
  permissions?: string[];
}

/**
 * Lee el payload del JWT **sin verificar la firma**: aquí solo se decide qué ofrecer
 * en la interfaz, nunca a qué se tiene derecho — de eso responde el servidor en cada
 * petición. Un token corrupto se trata como "sin datos", no como un error.
 */
function decodeTokenPayload(token: string | null): TokenPayload {
  if (!token) return {};
  const segments = token.split('.');
  if (segments.length !== 3) return {};
  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as TokenPayload;
  } catch {
    return {};
  }
}

export interface PermissionChecker {
  has: (code: string) => boolean;
  /**
   * TK-073-FE: alta/edición de insumos, ubicaciones y recetas están protegidas en el
   * backend por `requireRole('ADMIN')`, no por un permiso del catálogo (decisión de
   * producto del 2026-09-30). Esto refleja ese guard en un solo sitio, en vez de que
   * cada vista compare el rol a mano.
   */
  isAdmin: boolean;
}

/**
 * US-015 Escenario 2 / TK-121-FE: **único punto** que interpreta la lista de permisos.
 * Ninguna vista debe volver a comparar `role === 'ADMIN'` a mano.
 *
 * Ocultar un botón no es un control de acceso: es ergonomía (no ofrecer lo que
 * devolvería `403`). La autorización real la impone `authorizePermissions` en el
 * backend, resolviendo contra el repositorio en cada petición.
 *
 * Compatibilidad (mitigación #1 del ticket): un token emitido antes de `TK-121` no
 * trae `permissions`. En ese caso NO se asume "sin permisos" —eso dejaría sin
 * navegación a todo usuario con sesión viva—, sino que se reproduce el gating por rol
 * anterior. Es una rama transitoria: esos tokens caducan a las 12 h.
 */
export function usePermissions(): PermissionChecker {
  return readPermissions();
}

/** Versión no-hook de `usePermissions`, para decidir fuera del render (p. ej. tras el login). */
export function readPermissions(): PermissionChecker {
  const storedUser = AuthService.getStoredUser();
  // TK-140: el JWT viaja en una cookie `httpOnly` y el SPA ya no puede leerlo; los permisos
  // llegan en el cuerpo del login y se guardan con el usuario. Una sesión anterior a TK-140
  // aún tiene su token en `localStorage` y los permisos solo dentro de él.
  const permissions = storedUser?.permissions ?? decodeTokenPayload(AuthService.getLegacyToken()).permissions;
  // El rol se lee de la sesión almacenada (misma fuente que `useAppShell().currentUser`): en
  // la rama de compatibilidad el token puede ni siquiera tener la forma de un JWT.
  const isAdmin = storedUser?.role === 'ADMIN';

  if (permissions === undefined) {
    return { isAdmin, has: (code: string) => (isAdmin ? true : !LEGACY_ADMIN_ONLY_CODES.has(code)) };
  }

  return { isAdmin, has: (code: string) => permissions.includes(code) };
}

/**
 * US-015 Escenario 2 / TK-073-FE: quien prepara recetas aterriza en el Tablero FEFO de
 * Cocina; cualquier otro rol, en Bodega. Solo se aplica al iniciar sesión — recargar la
 * página conserva la ruta en la que estaba el operario.
 */
export function landingPathAfterLogin(checker: PermissionChecker): string {
  return checker.has('kitchen:recipe_prepare') ? '/' : '/bodega';
}
