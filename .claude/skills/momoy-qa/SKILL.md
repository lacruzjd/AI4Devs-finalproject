---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-qa
description: "Pipeline QA completo de momoy: pre-flight, análisis de riesgos, anti N+1 y mass-assignment, diseño de tests, mutation testing con umbral y veredicto en JSON estricto, con pausas de aprobación entre pasos. Úsalo antes de cerrar un conjunto de cambios. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-qa

**Entrada:** Opcional: el archivo o módulo objetivo. Si el usuario no lo indicó, analiza los cambios sin commitear (`git diff`).

Lee por completo y ejecuta, sin saltarte fases ni pausas de aprobación humana, el workflow `.agents/workflows/06_full_qa_pipeline.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/06_full_qa_pipeline.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
