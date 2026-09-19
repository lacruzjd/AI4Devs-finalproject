---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-validate
description: "Verifica la integridad del propio framework momoy (.agents/): tests de su tooling, enlaces, IDs de skills, agnosticismo de scripts, política de emojis y conformidad de los comandos con el estándar Agent Skills. Úsalo antes de proponer un cambio a .agents/ o tras actualizar momoy. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-validate

**Entrada:** No requiere argumentos.

Ejecuta desde la raíz del proyecto el script `.agents/scripts/validate_agents.sh` y reporta su resultado.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/scripts/validate_agents.sh`. Si ambos discrepan, manda el script.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
