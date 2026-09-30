import { DomainError } from '../../errors/DomainError.js';

/**
 * TK-174 (C-SEC-2): el rol de un operario debe existir en el catálogo `Role`, que es
 * editable en runtime (US-015) y por eso no cabe en un `z.enum`. Se rechaza como error
 * de validación (400) en la aplicación, con los roles válidos, en vez de dejar que la
 * persistencia lo descubra como un 404.
 */
export class UnknownRoleException extends DomainError {
  constructor(roleName: string, validRoles: string[]) {
    super(`El rol '${roleName}' no existe en el catálogo de roles. Roles válidos: ${validRoles.join(', ')}.`, 400);
  }
}
