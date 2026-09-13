---
name: momoy
description: "Punto de entrada de momoy: diagnostica en qué etapa del ciclo VSDD está el proyecto (sin bootstrapear, sin specs, con tickets pendientes) y recomienda el siguiente comando /momoy-*, sin modificar ningún archivo. Úsalo para orientarte o cuando no sepas qué comando toca. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy

**Entrada:** Opcional. Si el usuario añadió una pregunta o un objetivo, úsalo para afinar la recomendación.

Lee `.agents/workflows/00_master_vsdd_workflow.md` (el mapa del ciclo VSDD) y diagnostica el estado del proyecto. **Este comando es de solo lectura: no crees, edites ni borres ningún archivo.**

1. **¿Bootstrapeado?** Si `AGENTS.md` no existe o es el stub de `install.sh` (contiene "proyecto sin bootstrapear"), el proyecto no arrancó: recomienda `/momoy-greenfield` si el directorio no tiene código relevante, o `/momoy-brownfield` si ya tiene código funcionando.
2. **¿Stack aprobado?** Si falta `docs/00_stack_manifest.md`, el bootstrap quedó incompleto: recomienda retomar el workflow de bootstrap que corresponda.
3. **¿Tickets pendientes?** Revisa los `status` del frontmatter de `docs/05_agile_planning/12_tickets/**/TK-*.md` (y `12_indice_tickets.md` si existe). Si hay tickets aprobados sin cerrar, recomienda `/momoy-dev TK-XXX` para el siguiente según el orden del índice.
4. **Sin trabajo pendiente:** recomienda `/momoy-spec [idea]` para la siguiente funcionalidad, o `/momoy-audit-spec` si las especificaciones no se auditaron desde su último cambio.

Responde con: (a) el estado detectado y la evidencia (archivo que lo prueba), (b) el siguiente comando recomendado con su argumento, y (c) la tabla de comandos de la sección 2 de `.agents/README.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/00_master_vsdd_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
