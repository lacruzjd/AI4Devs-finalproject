---
document: technical_ticket
id: TK-158-FE
related_story: US-043
points: 2
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/shared/US-043.md
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
---

# TK-158-FE: Errores de Validación Junto a su Campo

> **Navegación del Framework SDD:**
> [Historia US-043](../../../11_user_stories/shared/US-043.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Mostrar los mensajes de validación junto al campo que los causa en los formularios de alta y edición de insumo, marcando los obligatorios y moviendo el foco al primer campo inválido; el banner de cabecera se conserva para errores sin campo asociado.

*   **ID US Relacionada:** `US-043`
*   **Módulo / Vertical Slice:** `shared`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `CreateInsumoModal.tsx`, `EditInsumoModal.tsx` y un helper compartido de errores por campo.

---

## Mitigación de Riesgos Técnicos
1. Duplicar el mensaje arriba y abajo: el banner solo aparece cuando el error no corresponde a un campo.
2. Accesibilidad: el mensaje se asocia al campo con `aria-describedby` y el campo inválido se marca con `aria-invalid`.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** el formulario de alta con el nombre vacío
*   **When** se intenta guardar
*   **Then** el mensaje aparece junto a Nombre y el foco va a ese campo

### Escenario 2 (Sin campo asociado)
*   **Given** un error del backend que no señala campo
*   **When** se intenta guardar
*   **Then** el mensaje se muestra en la cabecera, como hasta ahora

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades monetarias.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Fichas a crear/modificar:**
   - `apps/frontend/src/features/stock/components/CreateInsumoModal.tsx`
   - `apps/frontend/src/features/stock/components/EditInsumoModal.tsx`
   - `apps/frontend/src/tests/CreateInsumoModal.test.tsx`
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
