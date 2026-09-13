---
name: momoy-audit-dev
description: "Revisión adversarial de un Reviewer Independiente sobre el código de un ticket TK-XXX antes del commit: arquitectura, seguridad, accesibilidad, tests y quality gates, con veredicto explícito. Úsalo cuando un ticket está implementado y falta aprobarlo. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-audit-dev

**Entrada:** El identificador del ticket (`TK-XXX`) cuyo código se audita. Si el usuario no lo dio, pídeselo.

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/04_dev_audit_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/04_dev_audit_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
