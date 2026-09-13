---
name: 07_production_observability_workflow
description: "Workflow de observabilidad Shift-Right v2.1: captura logs/stacktraces de producción, traduce incidencias a escenarios BDD Gherkin, genera pruebas de regresión en borrador (con checkpoint humano obligatorio antes de sumarse a la suite real) y cierra el bucle de feedback convirtiendo incidencias en tickets TK-XXX del backlog."
version: "2.2.0"
category: "workflows/observability"
---

# Workflow de Observabilidad Shift-Right (v2.2.0)

Este workflow captura telemetría, errores y réplicas de producción para transformarlos de forma agnóstica en pruebas automatizadas de regresión **y en tickets técnicos accionables en el backlog**, cerrando el ciclo completo de mejora continua.

---

## Paso 1 — Ingesta y Diagnóstico de Incidencia (Shift-Right)
1. **Captura de Evidencias:** Leer el stacktrace, payload o log de la incidencia registrada en producción o prueba sintética.
2. **Extracción de Variables:** Identificar parámetros de entrada, estado inicial del sistema y la excepción o fallo de aserción producido.
3. **Anonimización GDPR (Guard 6):** Sanitizar cualquier PII (nombres, correos, IPs, credenciales) reemplazándola con identificadores sintéticos (`USER_SYNTHETIC_001`).

---

## Paso 2 — Formulación de Escenario de Regresión BDD
1. Traducir la incidencia técnica a un escenario en formato **BDD Gherkin** (`.feature`):
   ```gherkin
   Feature: Reproducción de Incidencia de Producción #INC-XXX

     Scenario: Reproducción determinista del error detectado en telemetría
       Given que el sistema se encuentra en el estado inicial anotado en el log
       When se ejecuta la operación con los parámetros sanitizados de la incidencia
       Then el sistema responde respetando la especificación y evitando la regresión
   ```

---

## Paso 3 — Integración en la Suite de Tests & Reparación TDD
1. **Fixture en borrador, nunca directo a la suite real (TK-055):** crea la prueba de regresión fallida (RED) como archivo `*.draft.test.{ts,tsx,...}` (o convención equivalente del test runner declarado) en `tests/regression/` — NUNCA con el nombre/extensión final que el runner oficial recoja automáticamente. Un fixture auto-generado sin revisión humana previa es exactamente el patrón que `rules/00_output_reporting_standard.md` (Anti-Gate-Hueco) prohíbe: una prueba que "existe" sin que nadie haya verificado que valida algo real, en vez de una aserción trivial o tautológica.
2. **Checkpoint humano obligatorio:** presenta el fixture en borrador al humano junto con el escenario Gherkin del Paso 2 y espera confirmación explícita antes de continuar. Solo tras la aprobación, renombra el archivo quitando `.draft` (o lo mueve a su ubicación final co-ubicada según `rules/02_testing_architecture_standard.md`) — ese renombrado es la señal de que un humano lo validó, no un paso automático.
3. Invocar [05_test_runner_workflow.md](05_test_runner_workflow.md) para ejecutar la reparación autónoma mediante el ciclo RED-GREEN-REFACTOR, solo sobre el fixture ya aprobado (sin `.draft`).
4. Validar con [06_full_qa_pipeline.md](06_full_qa_pipeline.md) que `0` regresiones hayan sido introducidas.

---

## Paso 4 — Cierre del Bucle: Incidencia → Ticket TK-XXX (NUEVO v2.0)

Una vez confirmada la regresión y el fix, cerrar el ciclo de feedback convirtiendo la incidencia en un ticket formal del backlog:

### 4.1. Clasificación de la Incidencia

1. **Severidad**, con la escala de [`SK-38`](../skills/development/07_performance_and_observability/SK-38_write_blameless_postmortem.md) (Fase 1): `critica`, `alta`, `media` o `baja`. Propónla al humano; la confirma él.
2. **Módulo afectado:** el slice o módulo del proyecto donde vive el fallo, según la estructura real de `docs/05_agile_planning/12_tickets/` y `docs/02_architecture_design/` — nunca una lista de módulos supuesta.
3. **Prioridad del ticket:** `critica` y `alta` → MUST; `media` → SHOULD; `baja` → COULD.

### 4.2. Generación del Ticket TK-XXX

1. Crear el ticket con [`SK-12`](../skills/specs/05_agile_planning/SK-12_generate_backlog_tickets.md): mismo frontmatter y mismas secciones obligatorias que cualquier otro ticket, para que pase el gate `ready`. Al ser una remediación técnica, `related_story` es `N/A (Técnico — incidencia INC-XXX)`. El escenario Gherkin del Paso 2 va en sus Criterios de Aceptación y el stacktrace sanitizado en su Descripción.
2. Su DoD exige la prueba de regresión del Paso 3 en verde y el comando de test declarado en `AGENTS.md` sin regresiones.
3. **Enlazar el ticket** en el índice de tickets y en la matriz de trazabilidad, y **registrar la incidencia** en `docs/05_agile_planning/15_history.md`:
   ```text
   [fecha UTC] | INC-XXX | severidad | Bug: [descripción breve] | TK-NNN generado | PM-NNN (si aplica) | Fix: PENDIENTE
   ```

### 4.2.b. Postmortem Obligatorio (severidad crítica o alta)

Si la severidad es `critica` o `alta`, abre el postmortem con `SK-38` en `docs/06_release_and_operations/postmortems/PM-NNN-{slug}.md` en cuanto la incidencia quede resuelta. Debe cerrarse en **5 días** desde `resolved_at`; pasado el plazo, el gate `postmortem` lo reporta como hallazgo. Las incidencias `media` y `baja` terminan con el ticket.

### 4.3. Notificación al Humano

Presentar al humano el resumen de la incidencia y el ticket generado para su **aprobación y priorización** antes de iniciar el ciclo de desarrollo:

```text
🔴 INCIDENCIA DETECTADA EN PRODUCCIÓN
════════════════════════════════════════
Incidencia: INC-XXX
Categoría:  [tipo]
Módulo:     [módulo afectado]
Severidad:  [critica | alta | media | baja]
Ticket:     TK-NNN (creado en docs/05_agile_planning/)
Postmortem: PM-NNN en borrador (obligatorio si critica o alta)
Prioridad sugerida: [MUST / SHOULD / COULD]

Escenario BDD generado:
  Given [estado inicial]
  When  [operación fallida]
  Then  [comportamiento esperado]

¿Aprueba el inicio del ciclo TDD para TK-NNN?
```

