---
document: technical_ticket
id: TK-154-FE
related_story: US-039
points: 3
type: frontend
status: approved
inputs:
  - docs/05_agile_planning/11_user_stories/kitchen/US-039.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-154-FE: Panel de Estado y Acciones Rápidas sobre el Inventario

> **Navegación del Framework SDD:**
> [Historia US-039](../../../11_user_stories/kitchen/US-039.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Montar sobre el inventario un panel con el recuento por urgencia, el feed de alertas FEFO (`AlertFeed`, ver `TK-149-FE`) y las acciones rápidas de extracción y consumo, reutilizando los remanentes que la ruta ya carga.

*   **ID US Relacionada:** `US-039`
*   **Módulo / Vertical Slice:** `kitchen`
*   **Estimación (Story Points):** 3 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** `TK-149-FE`

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `app/routes/InventarioRoute.tsx`, composición con `FEFOInventoryHealthBar`, `AlertFeed` y `ActionButton`.

---

## Mitigación de Riesgos Técnicos
1. Petición duplicada: el panel recibe por props los remanentes ya cargados.
2. Empujar el inventario fuera de la pantalla: el panel se mantiene compacto y colapsable en pantallas pequeñas.
3. Solapamiento con la barra de salud FEFO: se decide en implementación qué aporta cada uno y se presenta al humano si se duplican.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** remanentes críticos y próximos a vencer
*   **When** el operario abre la aplicación
*   **Then** ve el panel con urgencias, alertas y acciones rápidas sobre el inventario

### Escenario 2 (Error)
*   **Given** que la carga de alertas falla
*   **When** abre la aplicación
*   **Then** el panel muestra el error con reintento y el inventario sigue usable

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/app/routes/InventarioRoute.tsx`
   - `apps/frontend/src/tests/` — test de la ruta con el panel montado
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
