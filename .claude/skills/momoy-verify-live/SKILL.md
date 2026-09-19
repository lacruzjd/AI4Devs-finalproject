---
# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano
disable-model-invocation: true
name: momoy-verify-live
description: "Prueba la app de punta a punta en local con navegador real: levanta la infraestructura declarada en el stack manifest, recorre el flujo de usuario con el motor E2E declarado, captura evidencia y limpia el entorno al terminar. Úsalo para demostrar que un ticket funciona de verdad, no solo en tests. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.1"
---

# /momoy-verify-live

**Entrada:** El flujo de usuario a recorrer o el ticket (`TK-XXX`) cuyo flujo crítico se verifica. Si el usuario no lo dio, pídeselo.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/09_live_stack_verification_workflow.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/09_live_stack_verification_workflow.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
