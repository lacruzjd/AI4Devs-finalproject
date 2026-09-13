---
name: momoy-release
description: "Lleva a producción un conjunto de tickets cerrados sin riesgo: fija la versión SemVer, pasa los gates previos, declara la estrategia de liberación, clasifica migraciones, verifica la configuración de despliegue, planifica y ensaya el rollback, escribe las notas de versión y solo despliega con aprobación humana. Úsalo cuando haya tickets done listos para producción. No lo uses para validar un despliegue ya hecho: usa /momoy-smoke. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-release

**Entrada:** Opcional: la versión propuesta (`X.Y.Z`). Si no la indicó, propónla a partir de los tickets cerrados desde el último release.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/10_release_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/10_release_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
