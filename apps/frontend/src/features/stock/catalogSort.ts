import type { InsumoItem } from './services/stock.service.js';

/**
 * US-041 / TK-156-FE: orden del catálogo, aplicado en el cliente sobre el resultado ya
 * filtrado. El desempate es siempre por nombre para que dos cantidades iguales no bailen
 * entre repintados (orden estable).
 */
export type CatalogSort = 'name-asc' | 'name-desc' | 'quantity-asc' | 'quantity-desc';

export const CATALOG_SORTS: { key: CatalogSort; label: string }[] = [
  { key: 'name-asc', label: 'Nombre (A-Z)' },
  { key: 'name-desc', label: 'Nombre (Z-A)' },
  { key: 'quantity-asc', label: 'Cantidad (menor primero)' },
  { key: 'quantity-desc', label: 'Cantidad (mayor primero)' },
];

export const DEFAULT_CATALOG_SORT: CatalogSort = 'name-asc';

function byName(a: InsumoItem, b: InsumoItem): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

export function sortInsumos(insumos: InsumoItem[], sort: CatalogSort): InsumoItem[] {
  const sorted = [...insumos];
  if (sort === 'name-asc') return sorted.sort(byName);
  if (sort === 'name-desc') return sorted.sort((a, b) => byName(b, a));

  const direction = sort === 'quantity-asc' ? 1 : -1;
  return sorted.sort((a, b) => {
    const diff = Number(a.warehouseStock) - Number(b.warehouseStock);
    return diff !== 0 ? diff * direction : byName(a, b);
  });
}
