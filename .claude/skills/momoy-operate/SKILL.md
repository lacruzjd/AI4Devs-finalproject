---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-operate
description: "Diseña la operación de un servicio desplegado (SLOs de disponibilidad y latencia, alertas sobre síntomas con runbook, backups con RPO y RTO, política de presupuesto de error) o ensaya un simulacro de restauración, alerta, runbook o rollback con evidencia. Úsalo antes del primer release a producción, cuando cambian los objetivos o cuando toca un simulacro. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-operate

**Entrada:** `diseñar` para definir SLOs, runbooks y backups, o `ensayar` y el simulacro concreto. Si no lo indicó, pregúntale cuál de los dos modos quiere.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/04_governance_and_quality/SK-40_design_service_operations.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/04_governance_and_quality/SK-40_design_service_operations.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
