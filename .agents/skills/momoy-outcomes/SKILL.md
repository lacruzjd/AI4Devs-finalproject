---
name: momoy-outcomes
description: "Cierra el ciclo del producto: mide los KPIs cuya fecha de revisión venció con datos reales exportados, emite un veredicto por KPI contra su umbral y propone mantener, iterar, pivotar o retirar. Úsalo cuando llega la fecha de revisión de los KPIs o cuando quieras saber si una capacidad cumplió lo prometido. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-outcomes

**Entrada:** Opcional: los KPIs a medir. Si no los indicó, mide todos los que tengan la fecha de revisión vencida.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/01_product_definition/SK-39_measure_product_outcomes.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/01_product_definition/SK-39_measure_product_outcomes.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
