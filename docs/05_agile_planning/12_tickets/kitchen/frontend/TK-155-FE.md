---
document: technical_ticket
id: TK-155-FE
related_story: US-040
points: 2
type: frontend
status: approved
inputs:
  - docs/05_agile_planning/11_user_stories/kitchen/US-040.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-155-FE: Separar Vencidos de Caduca Hoy en la Vista de Remanentes

> **Navegación del Framework SDD:**
> [Historia US-040](../../../11_user_stories/kitchen/US-040.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Desdoblar el nivel de urgencia `critical` en `expired` y `today` en `urgency.ts`, añadir el grupo Vencidos en la vista y dejar el descarte como única acción disponible para ellos.

*   **ID US Relacionada:** `US-040`
*   **Módulo / Vertical Slice:** `kitchen`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** `TK-155`

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `shared/components/urgency.ts`, `UrgencyChip`, cubetas de `InventarioRoute`, acciones de fila.

---

## Mitigación de Riesgos Técnicos
1. Semántica de color: Vencidos y Caduca hoy comparten el rojo; se distinguen por etiqueta de texto, no solo por color.
2. Acción imposible en pantalla: consumir se oculta en vencidos y el backend lo rechaza igualmente (defensa en profundidad con `TK-155`).

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un remanente vencido y otro que caduca hoy
*   **When** el operario abre la vista
*   **Then** aparecen en grupos distintos, y el vencido solo ofrece descartar

### Escenario 2 (Error)
*   **Given** un remanente vencido
*   **When** se fuerza la acción de consumir
*   **Then** la interfaz muestra el mensaje `REMANENTE_EXPIRED` devuelto por el backend

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/shared/components/urgency.ts` y su test
   - `apps/frontend/src/app/routes/InventarioRoute.tsx`
   - `apps/frontend/src/shared/components/rowActionPresets.tsx`
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
