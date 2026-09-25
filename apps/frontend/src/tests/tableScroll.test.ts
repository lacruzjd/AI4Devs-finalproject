import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * TK-162-FE / US-045: en el tramo de teléfono, una tabla más ancha que la pantalla se
 * desplaza DENTRO de su contenedor; el cuerpo de la página nunca se desplaza en horizontal.
 *
 * El contenedor ya existía, pero sin ancho mínimo en la tabla nunca llegaba a activarse:
 * las columnas se aplastaban hasta ser ilegibles en lugar de desbordar.
 *
 * Se comprueba sobre la fuente y no montando los paneles porque éstos se buscan sus datos
 * solos: montar toda la pila de fetch para afirmar una envoltura daría un test frágil que
 * falla por razones ajenas a lo que vigila.
 */
function leer(relativo: string): string {
  return readFileSync(resolve(__dirname, '..', relativo), 'utf-8');
}

const PANELES_CON_TABLA = [
  'features/stock/components/MovementHistoryPanel.tsx',
  'features/stock/components/InsumoCatalogPanel.tsx',
];

describe('TK-162-FE: desplazamiento de tablas anchas', () => {
  it('la tabla declara un ancho mínimo para que su contenedor llegue a desplazarse', () => {
    expect(leer('styles/components/tables.css')).toMatch(/\.data-table\b[^}]*min-width:\s*\d+/s);
  });

  it('el contenedor de tabla desborda en horizontal, nunca el cuerpo de la página', () => {
    expect(leer('styles/components/tables.css')).toMatch(/\.table-wrapper\b[^}]*overflow-x:\s*auto/s);
  });

  it.each(PANELES_CON_TABLA)('%s envuelve su tabla en el contenedor desplazable', (archivo) => {
    const fuente = leer(archivo);
    const tablas = (fuente.match(/<table/g) ?? []).length;
    const envolturas = (fuente.match(/className="table-wrapper"/g) ?? []).length;
    expect(tablas).toBeGreaterThan(0);
    expect(envolturas).toBeGreaterThanOrEqual(tablas);
  });
});
