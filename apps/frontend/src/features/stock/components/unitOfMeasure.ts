/**
 * TK-170-FE / US-049 — resolución de la unidad de medida de un insumo.
 *
 * Antes vivía dentro de la pantalla de extracción con una tabla escrita a mano que
 * asociaba identificadores de insumo de demostración (`ins-2`, `ins-3`) a unidades, y
 * caía a `KG` para todo lo demás.
 *
 * La tabla era código muerto: la unidad está garantizada por construcción —columna no
 * nula y alta que la exige de un conjunto cerrado—. Lo que no era inocuo es el respaldo:
 * si algún día la API dejara de mapear el campo, la pantalla habría mostrado kilogramos
 * para todo, en silencio y con aspecto de dato correcto. Un fallo que se ve se arregla;
 * uno que se tapa se hereda.
 */
export const UNIDAD_AUSENTE = 'sin unidad';

export function resolveUnitOfMeasure(
  selectedInsumoId: string,
  insumos: { id: string; unit?: string }[]
): string {
  return insumos.find((i) => i.id === selectedInsumoId)?.unit ?? UNIDAD_AUSENTE;
}
