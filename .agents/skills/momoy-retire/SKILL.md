---
name: momoy-retire
description: "Retira una funcionalidad como cascada inversa: impacto hacia atrás, aviso a usuarios con al menos 30 días, tratamiento de datos según su retención y tickets de eliminación, con decisión humana. Úsalo cuando un informe de resultados recomienda retirar o el humano decide apagar una funcionalidad. No lo uses para borrar código muerto: eso es mantenimiento. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-retire

**Entrada:** La funcionalidad a retirar y su motivo (un `OUT-NNN` o la decisión del humano). Si no los dio, pídeselos.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/05_agile_planning/SK-41_retire_capability.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/05_agile_planning/SK-41_retire_capability.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
