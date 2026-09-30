/**
 * Siembra una sesión en `localStorage` tal como lo hace `AuthService` tras un login real
 * desde TK-140: el usuario con su `role` y (desde TK-121) sus `permissions`. El token no se
 * guarda en ningún sitio accesible a JavaScript: viaja en la cookie `httpOnly`.
 *
 * Los permisos solo deciden qué ofrecer en la interfaz; la autorización real la impone el
 * backend en cada petición (ver `usePermissions`).
 */
export function seedSession(options: { role?: string; permissions?: string[] } = {}): void {
  const { role = 'ADMIN', permissions } = options;
  localStorage.setItem(
    'restostock_user_info',
    JSON.stringify({ id: 'usr-test', name: 'Usuario de Prueba', role, ...(permissions ? { permissions } : {}) })
  );
}

export function clearSession(): void {
  localStorage.removeItem('restostock_jwt_token');
  localStorage.removeItem('restostock_user_info');
}

/** Los 8 permisos del rol ADMIN en el seed real (`prisma/seed.ts`). */
export const ALL_PERMISSIONS = [
  'stock:extract',
  'stock:restock',
  'stock:read',
  'kitchen:recipe_prepare',
  'kitchen:remanente_consume',
  'reports:view',
  'users:manage',
  'roles:manage',
];

/** Los 5 permisos de KITCHEN_STAFF en el seed real: sin reports:view, users:manage ni roles:manage. */
export const KITCHEN_STAFF_PERMISSIONS = [
  'stock:extract',
  'stock:restock',
  'stock:read',
  'kitchen:recipe_prepare',
  'kitchen:remanente_consume',
];
