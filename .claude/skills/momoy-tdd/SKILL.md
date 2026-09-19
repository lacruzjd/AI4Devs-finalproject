---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-tdd
description: "Ejecuta el bucle autónomo de TDD (Red-Green-Refactor) de un ticket TK-XXX: lee sus escenarios BDD, genera tests, corre el test runner declarado en AGENTS.md y corrige fallos, con un máximo de 3 intentos. Úsalo para la fase de pruebas de un ticket concreto. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-tdd

**Entrada:** El identificador del ticket (`TK-XXX`). Si el usuario no lo dio, pídeselo.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/05_test_runner_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/05_test_runner_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
