---
name: momoy-incident
description: "Convierte una incidencia de producción en trabajo gobernado: analiza el log o stacktrace, lo traduce a escenarios BDD, genera pruebas de regresión en borrador con checkpoint humano y crea el ticket TK-XXX en el backlog. Úsalo cuando llega un error real de producción. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-incident

**Entrada:** El log, stacktrace o descripción de la incidencia. Si el usuario no lo dio, pídeselo antes de empezar.

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/07_production_observability_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/07_production_observability_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
