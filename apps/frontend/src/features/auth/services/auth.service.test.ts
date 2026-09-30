import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService.loginWithPin — sin bypass de autenticación', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guarda el usuario con sus permisos y ningún token: la sesión viaja en la cookie httpOnly (TK-140)', async () => {
    const mockResponse = {
      user: { id: 'usr-1', name: 'Carlos', role: 'OPERATOR', permissions: ['stock:read'] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }));

    const result = await AuthService.loginWithPin('usr-1', '1234');

    expect(result).toEqual(mockResponse);
    expect(AuthService.getStoredUser()).toEqual(mockResponse.user);
    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
    expect(JSON.stringify(localStorage)).not.toMatch(/jwt|token/i);
  });

  it('un login nuevo borra el token antiguo de localStorage (sesión anterior a TK-140)', async () => {
    localStorage.setItem('restostock_jwt_token', 'token-heredado');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'usr-1', name: 'Carlos', role: 'OPERATOR' } }),
    }));

    await AuthService.loginWithPin('usr-1', '1234');

    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
  });

  it('TK-176: purgeStaleToken borra el token antiguo que quede en localStorage', () => {
    localStorage.setItem('restostock_jwt_token', 'token-heredado');

    AuthService.purgeStaleToken();

    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
  });

  it('logout borra la sesión local y pide al servidor que borre la cookie httpOnly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    AuthService.saveSession({ id: 'usr-1', name: 'Carlos', role: 'OPERATOR' });
    localStorage.setItem('restostock_jwt_token', 'token-heredado');

    AuthService.logout();

    expect(AuthService.getStoredUser()).toBeNull();
    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/auth/logout');
    expect(init.method).toBe('POST');
  });

  it('relanza el error real cuando el backend rechaza el PIN (400/401) — comportamiento ya correcto, no debe cambiar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'PIN invalido o incorrecto' }),
    }));

    await expect(AuthService.loginWithPin('usr-1', '9999')).rejects.toThrow(/PIN invalido/);
    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
  });

  it('relanza el error real ante un fallo genérico del backend (500) en vez de crear una sesión falsa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Error interno del servidor' }),
    }));

    await expect(AuthService.loginWithPin('usr-1', '1234')).rejects.toThrow(/Error interno del servidor/);
    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
  });

  it('relanza el error real ante un fallo de red (fetch rechazado) en vez de crear una sesión falsa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network request failed')));

    await expect(AuthService.loginWithPin('usr-1', '1234')).rejects.toThrow(/Network request failed/);
    expect(localStorage.getItem('restostock_jwt_token')).toBeNull();
  });

  it('un userId que contenga "maria" NO obtiene sesión ADMIN automática cuando el backend falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('backend caído')));

    await expect(AuthService.loginWithPin('maria-operario', '1234')).rejects.toThrow();
    expect(localStorage.getItem('restostock_user_info')).toBeNull();
  });

  describe('requestForgotPin & resetAdminPin (TK-077-FE)', () => {
    it('requestForgotPin envía solicitud POST al backend y retorna mensaje exitoso', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Instrucciones enviadas.' }),
      }));

      const res = await AuthService.requestForgotPin('admin@restostock.com');
      expect(res.message).toBe('Instrucciones enviadas.');
    });

    it('resetAdminPin envía token y nuevo PIN y confirma restablecimiento', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'PIN actualizado exitosamente.' }),
      }));

      const res = await AuthService.resetAdminPin('valid-token-12345678', '9876');
      expect(res.message).toBe('PIN actualizado exitosamente.');
    });

    it('resetAdminPin propaga error RFC 7807 detail cuando el token es inválido o ha expirado', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: 'El token de recuperación es inválido o ha expirado.' }),
      }));

      await expect(AuthService.resetAdminPin('invalid-token', '9876')).rejects.toThrow(
        /inválido o ha expirado/
      );
    });
  });
});
