---
document: technical_ticket
id: TK-161-FE
related_story: US-045
points: 3
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/shared/US-045.md
  - docs/02_architecture_design/05_ui_ux_design_system.md
  - docs/04_governance_and_quality/rules/frontend_rules.md
---

# TK-161-FE: Tramo de Teléfono en el Shell y el Tablero de Cocina

> **Navegación del Framework SDD:**
> [Historia US-045](../../../11_user_stories/shared/US-045.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Aplicar el tramo `xs` (`<480px`) declarado en el sistema de diseño §6 a el shell y la ruta raíz: la franja superior de navegación, una ficha por fila, el bloque de urgentes colapsable y el filtro de áreas con desplazamiento propio.

*   **ID US Relacionada:** `US-045`
*   **Módulo / Vertical Slice:** `shared`
*   **Estimación (Story Points):** 3 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** `AppShell.module.css`, `InventarioRoute`, `AlertFeed`, `ActiveRemanentesList`, `LocationFilterTabs` y sus estilos. Los tokens y el corte de tramo salen del sistema de diseño; **prohibido introducir un ancho de corte ad-hoc** sin declararlo antes en la matriz §6.

---

## Mitigación de Riesgos Técnicos
1. **Relajar el objetivo táctil para ganar espacio:** prohibido. El mínimo de 48 × 48 px rige igual en `xs`; un tramo más estrecho reduce densidad, nunca el objetivo táctil.
2. **Desplazamiento horizontal del documento:** el contenido ancho se desplaza dentro de su propio contenedor; el cuerpo de la página nunca.
3. **Regresión en tablet:** el tramo `md` y superiores no cambian de comportamiento; lo que se añade son reglas por debajo de 480px.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un ancho de 390px
*   **When** se abre la pantalla
*   **Then** el contenido se lee sin desplazamiento horizontal del cuerpo y toda acción sigue alcanzable

### Escenario 2 (Sin regresión en tablet)
*   **Given** un ancho de 768px
*   **When** se abre la misma pantalla
*   **Then** el layout es idéntico al actual

### Escenario 3 (Ergonomía)
*   **Given** cualquier elemento interactivo en 390px
*   **When** se mide
*   **Then** conserva el mínimo de 48 × 48 px

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`, y auditoría de la Fase 4 de `SK-05` sin hallazgos críticos.

---

## Hallazgo al implementar (2026-09-25)

El filtro de áreas declaraba `height: 40px`, por debajo del mínimo táctil de 48 px que el proyecto declara **innegociable** en todos los tramos. La barra del catálogo de bodega tenía el mismo defecto (`min-height: 40px`). Ambos corregidos aquí, porque la regla es global y no del tramo de teléfono.

Se añadió `src/tests/touchTargets.test.ts` como guardián: lee los ficheros de estilo de los componentes interactivos y falla si alguno declara una altura menor de 48 px. No es un test de estilo — es la única forma determinista de vigilar esa regla, porque el entorno de pruebas no aplica CSS y un test de render no la ve.

**Verificación visual pendiente:** que a 390 px el contenido se lea sin desplazamiento horizontal del cuerpo exige un navegador real (workflow 09). Lo comprobable aquí es la estructura y el cumplimiento del objetivo táctil.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Leer** `docs/02_architecture_design/05_ui_ux_design_system.md` §6 y `frontend_rules.md` §1 antes de escribir CSS.
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
