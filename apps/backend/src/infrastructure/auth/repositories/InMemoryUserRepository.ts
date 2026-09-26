import { User } from '../../../domain/auth/entities/User.js';
import { IUserRepository } from '../../../domain/auth/repositories/IUserRepository.js';
import { DuplicateOperatorCodeException } from '../../../domain/auth/errors/DuplicateOperatorCodeException.js';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  public async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? user : null;
  }

  public async findByOperatorCode(operatorCode: string): Promise<User | null> {
    const normalized = operatorCode.trim().toUpperCase();
    for (const user of this.users.values()) {
      if (user.operatorCode.trim().toUpperCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email && user.email.trim().toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public async findByResetTokenHash(tokenHash: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.resetTokenHash && user.resetTokenHash === tokenHash) {
        return user;
      }
    }
    return null;
  }


  public async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  public async save(user: User): Promise<void> {
    // US-051/TK-173: el fake modela el índice único real de PostgreSQL. Sin esto, un
    // test de integración verde sobre este repositorio no probaría nada sobre el
    // comportamiento en producción (Guard 39).
    await this.assertOperatorCodeIsFree(user);
    this.users.set(user.id, user);
  }

  private async assertOperatorCodeIsFree(user: User): Promise<void> {
    const owner = await this.findByOperatorCode(user.operatorCode);
    if (owner && owner.id !== user.id) {
      throw new DuplicateOperatorCodeException(user.operatorCode);
    }
  }

  public async update(user: User): Promise<void> {
    await this.assertOperatorCodeIsFree(user);
    this.users.set(user.id, user);
  }

  public async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Metodo helper para tests
  public seedUser(user: User): void {
    this.users.set(user.id, user);
  }
}
