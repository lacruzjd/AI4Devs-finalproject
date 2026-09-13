---
name: momoy-experiment
description: "Pone a prueba una hipótesis de producto antes de especificarla: diseña el experimento más barato con criterio de éxito fijado de antemano, o registra la evidencia real de uno ya ejecutado y propone la decisión. Úsalo cuando una capacidad tiene riesgo de valor alto o cuando vuelves con los resultados de un experimento. No lo uses para investigación de mercado. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-experiment

**Entrada:** Una hipótesis nueva para diseñar su experimento, o el `EXP-NNN` cuyo resultado se registra. Si no dio ninguna, pídesela.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/01_product_definition/SK-37_design_validation_experiment.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/01_product_definition/SK-37_design_validation_experiment.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
