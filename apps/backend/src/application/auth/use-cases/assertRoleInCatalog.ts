import { IRoleRepository } from '../../../domain/security/repositories/IRoleRepository.js';
import { UnknownRoleException } from '../../../domain/auth/errors/UnknownRoleException.js';

/** TK-174 (C-SEC-2): un rol solo se asigna si existe en el catálogo `Role` persistido. */
export async function assertRoleInCatalog(roleRepository: IRoleRepository, roleName: string): Promise<void> {
  if (await roleRepository.findRoleByName(roleName)) return;
  const validRoles = (await roleRepository.findAllRoles()).map((role) => role.name);
  throw new UnknownRoleException(roleName, validRoles);
}
