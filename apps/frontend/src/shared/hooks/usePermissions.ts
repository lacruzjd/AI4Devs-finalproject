import { AuthService } from '../../features/auth/services/auth.service.js';

/**
 * Permisos que, antes de `TK-121`, gateaban superficie exclusiva de `ADMIN`
 * (`AppNav.adminOnly` y `ProtectedRoute requiredRole="ADMIN"`). Solo se usan en la
 * ruta de compatibilidad para tokens sin `permissions`: reproducen exactamente el
 * comportamiento anterior, ni más ni menos.
 */
const LEGACY_ADMIN_ONLY_CODES = new Set(['reports:view', 'roles:manage', 'users:manage']);

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
 * Compatibilidad (mitigación #1 del ticket): un usuario guardado sin `permissions` NO se
 * trata como "sin permisos" —eso dejaría sin navegación a quien tenga sesión viva—, sino
 * que se reproduce el gating por rol anterior a `TK-121`.
 */
export function usePermissions(): PermissionChecker {
  return readPermissions();
}

/** Versión no-hook de `usePermissions`, para decidir fuera del render (p. ej. tras el login). */
export function readPermissions(): PermissionChecker {
  const storedUser = AuthService.getStoredUser();
  // TK-140/TK-176: el JWT viaja en una cookie `httpOnly` que el SPA no puede leer; los
  // permisos llegan en el cuerpo del login y se guardan con el usuario, única fuente.
  const permissions = storedUser?.permissions;
  // El rol se lee de la sesión almacenada (misma fuente que `useAppShell().currentUser`).
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
