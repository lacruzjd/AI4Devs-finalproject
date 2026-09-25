import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * TK-161-FE / US-045: la ergonomía táctil no se relaja por tramo. El sistema de diseño
 * declara 48 x 48 px como mínimo innegociable en todos los breakpoints, y ya se había
 * violado en silencio: el filtro de áreas media 40px de alto.
 *
 * Esto no es un test de estilo: es el guardián de una regla que el proyecto declara
 * innegociable y que un test de render en jsdom no puede comprobar, porque jsdom no
 * aplica CSS.
 */
function css(relativo: string): string {
  return readFileSync(resolve(__dirname, '..', relativo), 'utf-8');
}

const INTERACTIVOS = [
  'features/kitchen/components/LocationFilterTabs.module.css',
  'features/stock/components/CatalogToolbar.module.css',
];

describe('TK-161-FE: objetivo táctil mínimo de 48px en elementos interactivos', () => {
  it.each(INTERACTIVOS)('%s no declara alturas interactivas por debajo de 48px', (archivo) => {
    const contenido = css(archivo);
    const alturas = [...contenido.matchAll(/(?:min-)?height:\s*(\d+)px/g)].map((m) => Number(m[1]));
    const pequenas = alturas.filter((alto) => alto > 0 && alto < 48);
    expect(pequenas).toEqual([]);
  });
});
