---
document: technical_ticket
id: TK-177-FE
related_story: N/A (Técnico — refactor sin cambio de comportamiento · EXT-002 R-06)
points: 2
type: frontend
status: done
inputs:
  - apps/frontend/src/features/stock/components/WarehouseExtractionModal.tsx
  - docs/04_governance_and_quality/external_reviews/EXT-002-revision-de-entrega-final.md
---

# TK-177-FE: Partir `WarehouseExtractionModal.tsx` en Ficheros por Responsabilidad

> **Navegación del Framework SDD:**
> [Índice de Tickets](../../tickets_index.md) | [Revisión de origen (EXT-002)](../../../../04_governance_and_quality/external_reviews/EXT-002-revision-de-entrega-final.md)

---

## Descripción

**Remediación técnica** (carve-out C-DEV-006-4): ni el product owner ni el usuario notan ninguna diferencia. La revisión del tutor (`EXT-002`, R-06) señaló que `WarehouseExtractionModal.tsx` mide 757 líneas y mezcla formulario, validación y lógica de negocio. La ingesta lo clasificó como "implementado" porque el fichero ya está descompuesto en 16 piezas con nombre, pero todas siguen en un único archivo de 750 líneas, y eso es lo que ve quien lo abre.

Este ticket mueve esas piezas, sin reescribirlas, a una carpeta `warehouseExtraction/` agrupada por responsabilidad.

*   **ID US Relacionada:** N/A (Técnico — `EXT-002` R-06)
*   **Módulo / Vertical Slice:** `stock`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Could Have
*   **Prerrequisitos:** ninguno

---

## Alcance

| Fichero nuevo | Contenido |
| :-- | :-- |
| `warehouseExtraction/types.ts` | `Insumo`, `ExtractionPurpose`, `ExtractionFormProps`, `stockAtSector` |
| `warehouseExtraction/ExtractionFields.tsx` | Campos de insumo, propósito, receta, porciones, preparación en curso, destino y motivo |
| `warehouseExtraction/ExtractionForm.tsx` | Formulario, selector de cantidad, aviso de remanente duplicado y nota de destino |
| `warehouseExtraction/useExtractionForm.ts` | Estado, validación, aritmética decimal del paso y envío |
| `warehouseExtraction/useAvailableInsumos.ts` | Carga de insumos y escaneo de código de barras |
| `WarehouseExtractionModal.tsx` | Solo el modal; conserva su ruta y su export, así que ningún consumidor cambia |

---

## Criterios de Aceptación & DoD

1. `WarehouseExtractionModal.test.tsx` sigue en verde **sin modificar ningún test**.
2. Ningún fichero resultante supera las 300 líneas.
3. Sin cambios de comportamiento ni de texto visible; los consumidores (`BodegaRoute`, `InventarioRoute`) no cambian.
4. Suites, build, lint y gates del ticket (duplicación, código muerto, complejidad) en verde.
5. **Commit:** `refactor(stock): split the warehouse extraction modal by responsibility (TK-177-FE)`.

---

## Resolución (2026-09-30)

| Fichero | Líneas |
| :-- | --: |
| `WarehouseExtractionModal.tsx` | 75 (antes 750) |
| `warehouseExtraction/ExtractionFields.tsx` | 234 |
| `warehouseExtraction/useExtractionForm.ts` | 208 |
| `warehouseExtraction/ExtractionForm.tsx` | 111 |
| `warehouseExtraction/useAvailableInsumos.ts` | 77 |
| `warehouseExtraction/types.ts` | 59 |

El código se movió sin reescribirlo; el único cambio es el alias `ExtractionPurpose`, que sustituye la unión de tres literales repetida seis veces. `WarehouseExtractionModal.test.tsx`: 15/15 en verde antes y después, sin modificar ningún test. Suites completas (backend 638, frontend 308), build, lint, tipos y gates de complejidad, duplicación y código muerto en verde.
