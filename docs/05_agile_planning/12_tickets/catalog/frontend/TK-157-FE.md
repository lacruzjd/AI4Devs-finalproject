---
document: technical_ticket
id: TK-157-FE
related_story: US-042
points: 3
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/catalog/US-042.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-157-FE: Ficha de Insumo con sus Movimientos Recientes

> **Navegación del Framework SDD:**
> [Historia US-042](../../../11_user_stories/catalog/US-042.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Añadir la ficha de insumo con stock por sector y sus movimientos recientes, reutilizando `GET /api/v1/stock/movements?insumoId=` (sin endpoint nuevo), accesible desde el catálogo y con acceso a reponer.

*   **ID US Relacionada:** `US-042`
*   **Módulo / Vertical Slice:** `catalog`
*   **Estimación (Story Points):** 3 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** componente de ficha en `features/stock/components/`, consumo de `stock.service.ts`, enlace desde `InsumoCatalogGrid`.

---

## Mitigación de Riesgos Técnicos
1. Historial largo: se piden los movimientos más recientes con límite, no el histórico completo.
2. Visibilidad: la ficha respeta ADR-007; sin `stock:read` no se muestra el bloque de movimientos.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un insumo con movimientos
*   **When** se abre su ficha
*   **Then** muestra stock por sector y sus movimientos recientes

### Escenario 2 (Vacío)
*   **Given** un insumo sin movimientos
*   **When** se abre su ficha
*   **Then** muestra su estado vacío explicando que aún no tiene movimientos

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/features/stock/components/` — componente de ficha
   - `apps/frontend/src/features/stock/services/stock.service.ts`
   - `apps/frontend/src/tests/` — test de la ficha con y sin movimientos
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
