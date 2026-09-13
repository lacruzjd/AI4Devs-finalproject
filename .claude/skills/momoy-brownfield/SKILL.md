---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-brownfield
description: "Adopta momoy en un código existente sin docs/ previo: reconstruye producto, dominio y stack por ingeniería inversa con entrevista humana obligatoria y cataloga la deuda técnica. Úsalo una sola vez por proyecto con código funcionando. No lo uses en un directorio vacío: usa /momoy-greenfield. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-brownfield

**Entrada:** La ruta del código a adoptar. Si el usuario no la dio, usa la raíz del proyecto actual y confírmalo con él.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/00_brownfield_adoption_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/00_brownfield_adoption_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
