import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * TK-163-FE / US-045: en el tramo de teléfono los modales se presentan a hoja completa,
 * no como ventana centrada.
 *
 * Una ventana centrada con formulario en 390 px deja márgenes inútiles y empuja el botón
 * de confirmación a la zona de difícil alcance del pulgar, que es justo donde el operario
 * tiene que llegar con una mano mientras sostiene algo con la otra.
 */
function leer(relativo: string): string {
  return readFileSync(resolve(__dirname, '..', relativo), 'utf-8');
}

describe('TK-163-FE: modales a hoja completa en el tramo de teléfono', () => {
  it('el shell de modal declara el tramo de teléfono', () => {
    expect(leer('shared/components/Modal.module.css')).toMatch(/@media \(max-width: 479px\)/);
  });

  it('a hoja completa: el overlay deja de centrar y la tarjeta ocupa todo el ancho', () => {
    const css = leer('shared/components/Modal.module.css');
    const tramo = css.slice(css.indexOf('@media (max-width: 479px)'));
    expect(tramo).toMatch(/align-items:\s*stretch/);
    expect(tramo).toMatch(/width:\s*100%/);
  });

  it('el botón de confirmación queda al alcance del pulgar, fijo abajo', () => {
    const css = leer('styles/components/modals.css');
    const tramo = css.slice(css.indexOf('@media (max-width: 479px)'));
    expect(tramo).toMatch(/position:\s*sticky/);
    expect(tramo).toMatch(/bottom:\s*0/);
  });
});
