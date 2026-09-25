/**
 * TK-159-FE / US-044 / ADR-008: registro del service worker que cachea el bundle para
 * que la aplicación abra sin conexión.
 *
 * La versión viaja en la URL a propósito. El navegador compara el service worker byte a
 * byte contra el que ya tiene registrado: si la URL cambia, instala el nuevo, y el nuevo
 * borra los cachés de versiones anteriores al activarse. Sin esto, un despliegue corregido
 * no llegaría nunca a quien ya tiene la aplicación instalada — el fallo clásico de una PWA.
 */
export interface RegisterOptions {
  /** Falso en desarrollo: un caché en dev esconde los cambios que estás haciendo. */
  enabled: boolean;
  /** Versión del release. Ata la invalidación del caché al despliegue. */
  version: string;
}

export async function registerServiceWorker({ enabled, version }: RegisterOptions): Promise<void> {
  if (!enabled) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register(`/sw.js?v=${version}`);
  } catch {
    // Un fallo de registro degrada a la aplicación en línea de siempre; nunca impide arrancar.
  }
}
