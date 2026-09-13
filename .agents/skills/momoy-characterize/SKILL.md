---
name: momoy-characterize
description: "Congela con pruebas de caracterización el comportamiento actual de un módulo legado sin tests, incluidos sus bugs, y solo después lo refactoriza con esa red de seguridad en verde. Úsalo antes de modificar o refactorizar código existente que no tiene pruebas. No lo uses en código que ya tiene tests fiables ni para funcionalidad nueva: usa /momoy-dev. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-characterize

**Entrada:** La ruta del archivo o módulo legado a caracterizar. Si el usuario no la dio, pídesela.

Lee por completo y ejecuta el procedimiento `.agents/skills/development/05_quality_and_lint/SK-24_execute_characterization_testing.md`.

**Pausa obligatoria entre fases:** al terminar la FASE 2 (suite de caracterización 100% en verde), presenta al humano la suite y el plan de refactorización, y espera su aprobación antes de tocar código de producción en la FASE 3.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/development/05_quality_and_lint/SK-24_execute_characterization_testing.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
