---
name: momoy-deps
description: "Audita la seguridad de las dependencias del proyecto: árbol completo de paquetes, imagen de contenedor si existe, alucinaciones de paquetes y re-verificación tras upgrades mayores, con dictamen por hallazgo High o Critical. Úsalo cuando se publica una vulnerabilidad, antes de añadir o actualizar una dependencia, o en la revisión periódica de mantenimiento. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /momoy-deps

**Entrada:** Opcional: el paquete a evaluar antes de añadirlo o actualizarlo. Si el usuario no lo indicó, audita el árbol completo de dependencias del proyecto.

Lee por completo y ejecuta el procedimiento `.agents/skills/development/05_quality_and_lint/SK-23_audit_dependency_security.md`.

No instales, actualices ni elimines ninguna dependencia por tu cuenta: el dictamen se presenta al humano, y todo bump de versión MAJOR requiere su aprobación (Guard 24).

## Reglas del comando

- Este archivo es solo un punto de entrada: la fuente de verdad es `.agents/skills/development/05_quality_and_lint/SK-23_audit_dependency_security.md`. Si ambos discrepan, manda el procedimiento.
- Respeta cada pausa de aprobación humana del procedimiento: no guardes ni crees archivos antes de que el humano confirme (regla Human-in-the-Loop de `.agents/README.md`).
- Si el procedimiento genera código, configuración o infraestructura, lee antes `docs/00_stack_manifest.md` (Fase 0). Si una herramienta o versión no está ahí, detente y pregunta.
