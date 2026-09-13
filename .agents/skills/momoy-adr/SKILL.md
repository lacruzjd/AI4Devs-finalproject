---
name: momoy-adr
description: "Registra una decisión de arquitectura significativa como ADR: enmarca el problema, compara al menos tres opciones defendibles con su coste de reversión y deja la elección al humano. Úsalo cuando haya dos o más caminos viables y la decisión sea costosa de revertir o toque estructura, seguridad, contratos o datos. No lo uses para decisiones triviales o fácilmente reversibles. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-adr

**Entrada:** La decisión o disyuntiva a resolver: texto libre, un hallazgo de auditoría o el `US-XXX`/`TK-XXX` que la dispara. Si el usuario no la dio, pídesela.

Lee por completo y ejecuta, sin saltarte fases ni la pausa de elección humana, el procedimiento `.agents/skills/specs/02_architecture_design/SK-36_generate_architecture_decision_record.md`.

Si su test decisivo concluye que la decisión no merece un ADR, dilo y detente: no crees el archivo.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/02_architecture_design/SK-36_generate_architecture_decision_record.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
