import { User } from '../entities/User.js';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** US-051/TK-173: resolución por la credencial que el operario teclea (insensible a caja/espacios). */
  findByOperatorCode(operatorCode: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByResetTokenHash(tokenHash: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

