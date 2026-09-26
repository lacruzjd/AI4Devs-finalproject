import { Pin } from '../value-objects/Pin.js';

/**
 * TK-164 / US-046 / EXT-002 R-02.
 *
 * El administrador inicial se crea con un PIN de siembra que la documentación de
 * despliegue publica. La regla del proyecto es que ese PIN no sirva para operar hasta
 * cambiarlo, y el mecanismo entero existe —columna, dominio, caso de uso y bloqueo en la
 * interfaz—; lo único que faltaba era que el arranque lo disparase.
 *
 * El arranque no puede saber por sí solo si un administrador rotó su PIN o nunca lo hizo.
 * La evidencia más directa es el propio PIN: **si el hash almacenado todavía corresponde al
 * de siembra, nunca se rotó**. Reasentar la marca en cada arranque sin comprobarlo obligaría
 * a rotar de nuevo a quien ya cumplió, en cada despliegue.
 *
 * Nunca lanza: un fallo aquí no puede impedir el arranque del servicio ni dejar al
 * administrador sin forma de entrar. Ante un hash ilegible se responde que no consta que
 * siga sin rotar, que es la respuesta que no molesta a nadie.
 */
export function nuncaSeRotoElPin(storedPinHash: string, seedPin: string): boolean {
  if (!storedPinHash || !seedPin) return false;
  try {
    return Pin.createFromHash(storedPinHash).compareWithRaw(seedPin);
  } catch {
    return false;
  }
}
