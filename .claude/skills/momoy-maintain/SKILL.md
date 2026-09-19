---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-maintain
description: "Revisión periódica de mantenimiento cada 30 días: dependencias y vulnerabilidades, deuda técnica, feature flags pendientes de retirar, salud de la operación y deuda de especificaciones, con candidatos a retirada y un ticket por cada hallazgo accionable. Úsalo cuando toca la revisión mensual o tras un periodo sin tocar el sistema. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-maintain

**Entrada:** No requiere argumentos. Si el usuario quiere acotar la revisión a un área, respétalo e indícalo en el registro.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/11_maintenance_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/11_maintenance_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
