import { IUserRepository } from '../../../domain/auth/repositories/IUserRepository.js';

export interface ListUsersItemDTO {
  id: string;
  operatorCode: string;
  name: string;
  role: string;
  status: string;
}

export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(): Promise<ListUsersItemDTO[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user.id,
      operatorCode: user.operatorCode,
      name: user.name,
      role: user.role,
      status: user.status,
    }));
  }
}
