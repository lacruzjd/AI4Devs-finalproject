import { apiRequest, sessionHeaders } from '../../../shared/http/apiClient.js';

export interface SessionUser {
  id: string;
  name: string;
  role: string;
  mustChangePin?: boolean;
  /** TK-121/TK-140: códigos de permiso del rol; ausente en sesiones anteriores a TK-121. */
  permissions?: string[];
}

/**
 * TK-140 / ADR-005: la respuesta del login ya no trae el token. El backend lo emite en la
 * cookie `httpOnly` `restostock_session`, que ningún script puede leer.
 */
export interface LoginPinResponse {
  user: SessionUser;
}

export class AuthService {
  /**
   * Token de las sesiones abiertas antes de TK-140, que siguen vivas hasta caducar (12 h) o
   * cerrarse. Solo se lee, para no expulsar a esos operarios en el despliegue; ningún login
   * nuevo lo escribe. Retirada: TK-176, a partir del 2026-10-14.
   */
  private static LEGACY_TOKEN_KEY = 'restostock_jwt_token';
  private static USER_KEY = 'restostock_user_info';

  public static async loginWithPin(operatorCode: string, pin: string, baseUrl: string = '/api/v1'): Promise<LoginPinResponse> {
    try {
      const response = await fetch(`${baseUrl}/auth/login-pin`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operatorCode, pin }),
      });

      if (response.ok) {
        const data = (await response.json()) as LoginPinResponse;
        localStorage.removeItem(AuthService.LEGACY_TOKEN_KEY);
        localStorage.setItem(AuthService.USER_KEY, JSON.stringify(data.user));
        return data;
      }

      let errMessage = 'PIN de acceso invalido o incorrecto.';
      try {
        const errData = await response.json();
        errMessage = errData.message || errData.error || errMessage;
      } catch (errDataError) {
        console.warn('[AuthService] No se pudo parsear cuerpo JSON de error:', errDataError);
      }
      throw new Error(errMessage);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error de autenticación desconocido.');
    }
  }

  public static async changePin(userId: string, currentPin: string, newPin: string, baseUrl: string = '/api/v1'): Promise<void> {
    const response = await fetch(`${baseUrl}/auth/change-pin`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...sessionHeaders('POST'),
      },
      body: JSON.stringify({ userId, currentPin, newPin }),
    });

    if (!response.ok) {
      let errMessage = 'No se pudo actualizar el PIN.';
      try {
        const errData = await response.json();
        errMessage = errData.message || errData.detail || errMessage;
      } catch (parseError) {
        console.warn('[AuthService] Error parseando respuesta de error de changePin:', parseError);
      }

      throw new Error(errMessage);
    }

    const currentUser = AuthService.getStoredUser();
    if (currentUser) {
      currentUser.mustChangePin = false;
      localStorage.setItem(AuthService.USER_KEY, JSON.stringify(currentUser));
    }
  }

  /** Solo sesiones anteriores a TK-140 (ver `LEGACY_TOKEN_KEY`). */
  public static getLegacyToken(): string | null {
    return localStorage.getItem(AuthService.LEGACY_TOKEN_KEY);
  }

  public static getStoredUser(): SessionUser | null {
    const raw = localStorage.getItem(AuthService.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      console.warn('[AuthService] Error parseando datos de usuario de localStorage:', parseErr);
      return null;
    }
  }

  public static saveSession(user: SessionUser): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  public static async requestForgotPin(email: string, baseUrl: string = '/api/v1'): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/forgot-pin', {
      method: 'POST',
      body: { email },
      baseUrl,
    });
  }

  public static async resetAdminPin(token: string, newPin: string, baseUrl: string = '/api/v1'): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/reset-pin', {
      method: 'POST',
      body: { token, newPin },
      baseUrl,
    });
  }

  /**
   * Un script no puede borrar la cookie `httpOnly`: se le pide al servidor (TK-140). La
   * petición no se espera —el cierre de sesión local no depende de la red— y `keepalive` la
   * deja terminar aunque la página se esté descargando.
   */
  public static logout(baseUrl: string = '/api/v1'): void {
    localStorage.removeItem(AuthService.LEGACY_TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
    fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'same-origin', keepalive: true }).catch((err: unknown) => {
      console.warn('[AuthService] No se pudo cerrar la sesión en el servidor; la cookie caducará sola:', err);
    });
  }
}

