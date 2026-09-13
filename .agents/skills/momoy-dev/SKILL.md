---
name: momoy-dev
description: "Implementa un ticket técnico TK-XXX de momoy de punta a punta: extracción de reglas, migraciones, TDD, build, lint, QA visual y commit atómico. Úsalo cuando el ticket ya existe en docs/05_agile_planning/12_tickets/. No lo uses si el ticket no existe: primero /momoy-spec. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-dev

**Entrada:** El identificador del ticket (`TK-XXX`). Si el usuario no lo dio, pídeselo. Si el archivo del ticket no existe, detente y recomienda `/momoy-spec`.

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/02_cascading_dev_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/02_cascading_dev_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
