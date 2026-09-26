import crypto from 'crypto';
import { User, UserRole } from '../../../domain/auth/entities/User.js';
import { Pin } from '../../../domain/auth/value-objects/Pin.js';
import { IUserRepository } from '../../../domain/auth/repositories/IUserRepository.js';
import { DuplicateOperatorCodeException } from '../../../domain/auth/errors/DuplicateOperatorCodeException.js';

export interface CreateUserDTO {
  name: string;
  operatorCode: string;
  role: UserRole;
  pin: string;
}

export interface CreateUserResponseDTO {
  id: string;
  operatorCode: string;
  name: string;
  role: UserRole;
  status: string;
}

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: CreateUserDTO): Promise<CreateUserResponseDTO> {
    // Guard 39: camino rápido y legible, NUNCA la defensa. La garantía real es el
    // índice único de la base de datos, que el repositorio traduce a esta misma
    // excepción — si dos altas concurrentes superan ambas esta lectura, solo una fila
    // llega a existir y la otra recibe idéntico 409.
    const existing = await this.userRepository.findByOperatorCode(dto.operatorCode);
    if (existing) {
      throw new DuplicateOperatorCodeException(dto.operatorCode);
    }

    const user = new User({
      id: crypto.randomUUID(),
      operatorCode: dto.operatorCode,
      name: dto.name,
      role: dto.role,
      pin: Pin.createFromRaw(dto.pin),
      status: 'ACTIVE',
      failedAttempts: 0,
    });

    await this.userRepository.save(user);

    return {
      id: user.id,
      operatorCode: user.operatorCode,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }
}
