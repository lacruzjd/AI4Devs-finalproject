---
name: momoy-postmortem
description: "Analiza una incidencia ya resuelta con un postmortem sin culpa: línea de tiempo con fuentes, impacto, causas del sistema, por qué ningún gate la detectó y acciones trazadas a tickets. Obligatorio para severidad crítica o alta, en los 5 días siguientes a la resolución. No lo uses mientras la incidencia sigue abierta: primero /momoy-incident. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-postmortem

**Entrada:** El `PM-NNN` en borrador o la descripción de la incidencia resuelta con su evidencia. Si no dio ninguna, pídesela.

Lee por completo y ejecuta el procedimiento `.agents/skills/development/07_performance_and_observability/SK-38_write_blameless_postmortem.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/development/07_performance_and_observability/SK-38_write_blameless_postmortem.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
