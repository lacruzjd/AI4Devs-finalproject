import { apiRequest } from '../../../shared/http/apiClient.js';

export interface CreateUserRequest {
  name: string;
  /** US-051/TK-173-FE: credencial con la que el operario entra, no la clave interna. */
  operatorCode: string;
  role: string;
  pin: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: string;
  pin?: string;
}

export interface CreateUserResult {
  id: string;
  operatorCode: string;
  name: string;
  role: string;
  status: string;
}

export interface SetUserStatusResult {
  id: string;
  status: string;
}

export interface UserListItem {
  id: string;
  operatorCode: string;
  name: string;
  role: string;
  status: string;
}

export class UsersService {
  public static async listUsers(): Promise<UserListItem[]> {
    return apiRequest<UserListItem[]>('/auth/users');
  }

  public static async createUser(data: CreateUserRequest): Promise<CreateUserResult> {
    return apiRequest<CreateUserResult>('/auth/users', { method: 'POST', body: data });
  }

  public static async updateUser(userId: string, data: UpdateUserRequest): Promise<UserListItem> {
    return apiRequest<UserListItem>(`/auth/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: data,
    });
  }

  public static async setUserStatus(userId: string, action: 'BLOCK' | 'ACTIVATE'): Promise<SetUserStatusResult> {
    return apiRequest<SetUserStatusResult>(`/auth/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: { action },
    });
  }
}
