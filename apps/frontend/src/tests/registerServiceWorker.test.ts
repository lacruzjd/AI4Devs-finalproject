import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker } from '../shared/pwa/registerServiceWorker.js';

describe('TK-159-FE: registro del service worker (US-044 / ADR-008)', () => {
  const originalSW = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');

  function stubServiceWorker(register: ReturnType<typeof vi.fn>): void {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalSW) {
      Object.defineProperty(window.navigator, 'serviceWorker', originalSW);
    } else {
      Reflect.deleteProperty(window.navigator, 'serviceWorker');
    }
  });

  it('registra el service worker con la versión en la URL, para que un despliegue nuevo invalide el caché', async () => {
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker(register);

    await registerServiceWorker({ enabled: true, version: '1.4.0' });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register.mock.calls[0][0]).toBe('/sw.js?v=1.4.0');
  });

  it('no registra nada en desarrollo: un caché en dev esconde los cambios que estás haciendo', async () => {
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker(register);

    await registerServiceWorker({ enabled: false, version: '1.4.0' });

    expect(register).not.toHaveBeenCalled();
  });

  it('no falla en un navegador sin soporte: la aplicación sigue funcionando con red', async () => {
    Reflect.deleteProperty(window.navigator, 'serviceWorker');

    await expect(registerServiceWorker({ enabled: true, version: '1.4.0' })).resolves.toBeUndefined();
  });

  it('un fallo al registrar no rompe el arranque de la aplicación', async () => {
    const register = vi.fn().mockRejectedValue(new Error('sin permisos'));
    stubServiceWorker(register);

    await expect(registerServiceWorker({ enabled: true, version: '1.4.0' })).resolves.toBeUndefined();
  });
});
