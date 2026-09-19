---
document: technical_ticket
id: TK-156-FE
related_story: US-041
points: 2
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/catalog/US-041.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-156-FE: Ordenar el Catálogo por Nombre o Cantidad

> **Navegación del Framework SDD:**
> [Historia US-041](../../../11_user_stories/catalog/US-041.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Añadir a `CatalogToolbar` el selector de orden (nombre y cantidad, ascendente y descendente), aplicándolo en el cliente sobre el resultado ya filtrado y dejando visible el criterio activo.

*   **ID US Relacionada:** `US-041`
*   **Módulo / Vertical Slice:** `catalog`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `features/stock/components/CatalogToolbar.tsx` e `InsumoCatalogPanel.tsx`.

---

## Mitigación de Riesgos Técnicos
1. Perder el filtro al ordenar: el orden se aplica sobre el subconjunto filtrado, con test que lo fija.
2. Orden inestable: el desempate es por nombre para que dos cantidades iguales no bailen entre repintados.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un catálogo con cantidades distintas
*   **When** se ordena por cantidad ascendente
*   **Then** los insumos se muestran de menor a mayor y el criterio queda visible

### Escenario 2 (Combinación)
*   **Given** una búsqueda activa
*   **When** se cambia el orden
*   **Then** se ordena solo lo filtrado y la búsqueda se conserva

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/features/stock/components/CatalogToolbar.tsx`
   - `apps/frontend/src/features/stock/components/InsumoCatalogPanel.tsx`
   - `apps/frontend/src/tests/CatalogToolbar.test.tsx`
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
