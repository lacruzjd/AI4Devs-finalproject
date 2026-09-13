---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy
description: "Punto de entrada de momoy: diagnostica en qué etapa del ciclo VSDD está el proyecto (sin bootstrapear, sin specs, con tickets pendientes) y recomienda el siguiente comando /momoy-*, sin modificar ningún archivo. Úsalo para orientarte o cuando no sepas qué comando toca. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.1.1"
---

# /momoy

**Entrada:** Opcional: una pregunta u objetivo del usuario para afinar la recomendación.

Ejecuta, en modo de solo lectura, la sección «Diagnóstico de Estado del Proyecto» del workflow `.agents/workflows/00_master_vsdd_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/00_master_vsdd_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
