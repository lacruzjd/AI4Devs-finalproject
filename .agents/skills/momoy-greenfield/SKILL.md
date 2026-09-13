---
name: momoy-greenfield
description: "Arranca un proyecto nuevo desde cero con momoy: decide el stack con el humano, genera docs/00_stack_manifest.md, el esqueleto de docs/ y el AGENTS.md real. Úsalo una sola vez, en un directorio vacío o sin código relevante. No lo uses si ya hay código funcionando: usa /momoy-brownfield. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-greenfield

**Entrada:** La descripción de la idea del producto. Si el usuario no la dio, pídesela antes de empezar.

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/00_greenfield_bootstrap_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/00_greenfield_bootstrap_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
