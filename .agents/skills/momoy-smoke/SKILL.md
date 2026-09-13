---
name: momoy-smoke
description: "Valida un despliegue recién hecho: health check, smoke tests de contratos HTTP con 3 oráculos y cabeceras de seguridad, con veredicto PASS/FAIL. Si falla, propone volver a la versión anterior y espera la aprobación humana antes de ejecutar nada. Úsalo justo después de cada deploy. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.1.0"
---

# /momoy-smoke

**Entrada:** La URL del entorno desplegado. Si el usuario no la dio, pídesela; nunca asumas una URL.

Lee por completo y ejecuta, sin saltarte fases, el workflow `.agents/workflows/08_smoke_test_deploy_validation.md`.

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/workflows/08_smoke_test_deploy_validation.md`. Si ambos discrepan, manda el workflow.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
