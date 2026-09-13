---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-validate
description: "Verifica la integridad del propio framework momoy (.agents/): tests de su tooling, enlaces, IDs de skills, agnosticismo de scripts, política de emojis y conformidad de los comandos con el estándar Agent Skills. Úsalo antes de proponer un cambio a .agents/ o tras actualizar momoy. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-validate

**Entrada:** No requiere argumentos.

Ejecuta desde la raíz del proyecto:

```bash
bash .agents/scripts/validate_agents.sh
```

Reporta el resultado de cada verificación. Si algo falla, explica la causa con el archivo y la línea que da el script, y **propone** la corrección sin aplicarla: un cambio a `.agents/` no gobierna nada hasta que el humano confirma su diff (`.agents/rules/03_untrusted_content_standard.md`, Regla 5).

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/scripts/validate_agents.sh`.
- No modifiques archivos de `.agents/` para hacer pasar la validación sin aprobación explícita del humano.
