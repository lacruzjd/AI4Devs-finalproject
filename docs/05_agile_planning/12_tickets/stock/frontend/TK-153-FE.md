---
document: technical_ticket
id: TK-153-FE
related_story: US-038
points: 2
type: frontend
status: approved
inputs:
  - docs/05_agile_planning/11_user_stories/stock/US-038.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-153-FE: Movimientos como Sección de Primer Nivel

> **Navegación del Framework SDD:**
> [Historia US-038](../../../11_user_stories/stock/US-038.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Sacar la pantalla de movimientos de `/ajustes` a la ruta `/movimientos`, añadir su entrada en `AppNav` con `requiredPermission: 'stock:read'` y dejar una redirección desde la ruta antigua.

*   **ID US Relacionada:** `US-038`
*   **Módulo / Vertical Slice:** `stock`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `app/router.tsx`, `app/AppNav.tsx`, mover `MovimientosRoute` fuera de `routes/ajustes/`.

---

## Mitigación de Riesgos Técnicos
1. Enlaces guardados por el equipo: la ruta anterior redirige a la nueva en vez de dar 404.
2. Entrada duplicada en Ajustes: se retira de allí en el mismo cambio.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un operario con `stock:read`
*   **When** abre la aplicación
*   **Then** ve Movimientos en la navegación principal y accede sin pasar por Ajustes

### Escenario 2 (Error)
*   **Given** un usuario sin `stock:read`
*   **When** intenta abrir `/movimientos`
*   **Then** no ve la entrada y la ruta lo devuelve al inventario

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/app/router.tsx`
   - `apps/frontend/src/app/AppNav.tsx`
   - `apps/frontend/src/app/routes/MovimientosRoute.tsx` (movido)
   - `apps/frontend/src/tests/` — test de navegación y permisos
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
