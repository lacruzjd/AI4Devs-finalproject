---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-spec
description: "Integra una idea o funcionalidad nueva en las especificaciones de momoy en cascada: PRD, modelo de dominio, esquema de datos, contrato de API, historias de usuario, tickets y trazabilidad, antes de escribir código. Úsalo cuando el usuario proponga una capacidad de negocio nueva. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-spec

**Entrada:** La descripción de la idea o funcionalidad. Si el usuario no la dio, pídesela antes de empezar.

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/01_cascading_spec_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/01_cascading_spec_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
