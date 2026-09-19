---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-pr
description: "Documenta con veracidad un Pull Request o el historial de entregas: ramas, commits, tickets TK-XXX vinculados y quality gates, sin inventar metadatos, y actualiza el histórico del proyecto. Úsalo al abrir o cerrar un PR o al preparar una entrega. No lo uses para crear el PR ni para hacer merge. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-pr

**Entrada:** Opcional: el número de PR o la rama a documentar. Si el usuario no lo indicó, documenta los PRs verificables del historial reciente.

Lee por completo y ejecuta el procedimiento `.agents/skills/specs/05_agile_planning/SK-15_document_pull_requests.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/specs/05_agile_planning/SK-15_document_pull_requests.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
