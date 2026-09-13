---
name: momoy-audit-spec
description: "Audita la suficiencia de las especificaciones vivas de docs/ antes de codificar, en 7 fases y sin tocar código. Úsalo tras cambiar el PRD, el dominio, el esquema o el contrato de API, o antes de planificar un sprint. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-audit-spec

**Entrada:** Opcional: la carpeta o documento a auditar. Si el usuario no lo indicó, audita `docs/` completo.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/03_spec_audit_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/03_spec_audit_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
