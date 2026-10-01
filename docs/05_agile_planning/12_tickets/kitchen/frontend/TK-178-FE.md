---
document: technical_ticket
id: TK-178-FE
related_story: N/A (Técnico — refactor sin cambio de comportamiento · EXT-002 R-06)
points: 1
type: frontend
status: done
inputs:
  - apps/frontend/src/features/kitchen/components/ClosePreparationModal.tsx
  - docs/04_governance_and_quality/external_reviews/EXT-002-revision-de-entrega-final.md
---

# TK-178-FE: Partir `ClosePreparationModal.tsx` en Ficheros por Responsabilidad

> **Navegación del Framework SDD:**
> [Índice de Tickets](../../tickets_index.md) | [Revisión de origen (EXT-002)](../../../../04_governance_and_quality/external_reviews/EXT-002-revision-de-entrega-final.md) | [Precedente: TK-177-FE](../../stock/frontend/TK-177-FE.md)

---

## Descripción

**Remediación técnica** (carve-out C-DEV-006-4), gemela de `TK-177-FE`. La revisión del tutor (`EXT-002`, R-06) citó también `ClosePreparationModal.tsx` (430 líneas) como componente que mezcla formulario, validación y lógica. Las reglas de cuadre y validación ya son funciones puras, pero conviven en el mismo fichero que la interfaz. Este ticket las mueve, sin reescribirlas, a `closePreparation/`.

*   **ID US Relacionada:** N/A (Técnico — `EXT-002` R-06)
*   **Módulo / Vertical Slice:** `kitchen`
*   **Estimación (Story Points):** 1 SP
*   **Prioridad MoSCoW:** Could Have

---

## Alcance

| Fichero nuevo | Contenido |
| :-- | :-- |
| `closePreparation/closeRules.ts` | Estado de fila, cuadre sobrante + merma contra lo extraído, validación y construcción del cierre (sin React) |
| `closePreparation/useClosePreparation.ts` | Carga del detalle y áreas, estado del formulario y envío |
| `closePreparation/PreparationItemRow.tsx` | Fila por insumo: sobrante, destino, merma, motivo e indicador de cuadre |
| `closePreparation/ReconciliationForm.tsx` | Porciones reales y lista de filas |
| `ClosePreparationModal.tsx` | Solo el modal; conserva ruta y export |

---

## Criterios de Aceptación & DoD

1. Los tests existentes del modal siguen en verde **sin modificar ningún test**.
2. Ningún fichero resultante supera las 200 líneas.
3. Sin cambios de comportamiento ni de texto visible; los consumidores no cambian.
4. Suites, build, lint y gates del ticket en verde.
5. **Commit:** `refactor(kitchen): split the close preparation modal by responsibility (TK-178-FE)`.

---

## Resolución (2026-09-30)

| Fichero | Líneas |
| :-- | --: |
| `ClosePreparationModal.tsx` | 57 (antes 430) |
| `closePreparation/PreparationItemRow.tsx` | 140 |
| `closePreparation/useClosePreparation.ts` | 102 |
| `closePreparation/closeRules.ts` | 79 |
| `closePreparation/ReconciliationForm.tsx` | 73 |

Código movido sin reescribirlo. `ClosePreparationModal.test.tsx` (8) y `OpenPreparationsPanel.test.tsx` (4), que lo abre, en verde antes y después sin modificar ningún test. Suites completas (backend 638, frontend 308), build, lint, tipos y gates en verde.
