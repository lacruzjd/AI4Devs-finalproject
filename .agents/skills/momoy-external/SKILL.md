---
name: momoy-external
description: "Convierte un informe externo (auditoría UX, revisión de seguridad, consultoría o feedback de un cliente) en decisiones trazables: clasifica cada recomendación como implementada, gap, conflicto con una decisión aprobada, fuera de alcance o no verificable, con evidencia del repositorio, y solo los gaps se convierten en trabajo. Úsalo cuando llega un informe de fuera del equipo; no lo uses para auditar tus propias specs o tu código, que cubren /momoy-audit-spec y /momoy-audit-dev. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-external

**Entrada:** La ruta del informe externo, o su contenido pegado.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/04_governance_and_quality/SK-42_intake_external_review.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/04_governance_and_quality/SK-42_intake_external_review.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
