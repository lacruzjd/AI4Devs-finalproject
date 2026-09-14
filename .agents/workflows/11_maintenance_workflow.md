---
name: 11_maintenance_workflow
description: "Workflow de mantenimiento periódico: cada 30 días revisa dependencias y vulnerabilidades, deuda técnica, feature flags pendientes de retirar, salud de la operación y deuda de especificaciones, detecta candidatos a retirada y convierte cada hallazgo accionable en un ticket, con prioridad decidida por el humano."
version: "1.0.0"
category: "workflows/maintenance"
---

# Workflow 11: Revisión de Mantenimiento (v1.0.0)

> **DIRECTIVA PARA EL AGENTE:**
> Actúa como un **Tech Lead** que protege la salud del sistema a largo plazo. El software envejece aunque nadie lo toque: aparecen vulnerabilidades, la deuda se acumula, los flags se olvidan y los simulacros caducan.
>
> **Cadencia:** una revisión **cada 30 días** mientras exista algún release desplegado. Pasado ese plazo sin una revisión cerrada, el gate `mantenimiento` lo marca.
>
> **FASE 0 OBLIGATORIA (Guard 24):** lee `docs/00_stack_manifest.md` y la última revisión en `docs/06_release_and_operations/maintenance/`. Esta revisión parte de sus hallazgos abiertos.

Esta revisión **no corrige nada**: detecta, prioriza con el humano y abre tickets. La corrección ocurre después, ticket a ticket, con `/momoy-dev`.

---

## Paso 1 — Dependencias y Vulnerabilidades
Ejecutar la auditoría completa de [`SK-23`](../skills/development/05_quality_and_lint/SK-23_audit_dependency_security.md) (`/momoy-deps`): árbol de dependencias y, si el proyecto empaqueta contenedores, la imagen construida. Registrar vulnerabilidades `High` o `Critical` nuevas desde la revisión anterior y dependencias con versiones mayores pendientes.

## Paso 2 — Deuda Técnica
Actualizar el índice de deuda con [`SK-31`](../skills/development/01_rules_extraction/SK-31_technical_debt_indexer.md) en `docs/05_agile_planning/technical_debt.md` y señalar los elementos que más riesgo o fricción generan hoy.

## Paso 3 — Feature Flags
Listar los flags de los registros de release (`docs/06_release_and_operations/releases/`) cuyo ticket de retirada no esté `done`. Un flag que ya cumplió su propósito y sigue en el código es un *zombie flag*.

## Paso 4 — Operación
Revisar los hallazgos del gate `operacion`: runbooks sin ensayo, simulacro de restauración a punto de superar los 90 días, SLOs con el presupuesto `en_riesgo` o `agotado`.

## Paso 5 — Especificaciones y Ciclo
Ejecutar `python3 .agents/scripts/check_spec_artifacts.py` y revisar lo que el tiempo vuelve urgente: KPIs con fecha de revisión vencida (`/momoy-outcomes`), postmortems obligatorios sin cerrar, tickets abiertos que ya no cumplen la Definition of Ready.

## Paso 6 — Candidatos a Retirada
Señalar capacidades que podrían retirarse: informes de resultados con recomendación `retirar`, funcionalidades sin uso medible o que duplican otra. Proponerlas al humano para [`/momoy-retire`](../skills/specs/05_agile_planning/SK-41_retire_capability.md); nunca iniciar una retirada desde aquí.

## Paso 7 — Hallazgos y PAUSA HitL
1. Consolidar los hallazgos de los Pasos 1 a 6 con su riesgo.
2. **PAUSA HitL:** presentar la lista al humano, que decide qué se hace y en qué orden.
3. Para cada hallazgo aprobado, crear el ticket con [`SK-12`](../skills/specs/05_agile_planning/SK-12_generate_backlog_tickets.md). Los descartados se registran como `sin acción — motivo`.

## Paso 8 — Registro
1. Escribir `docs/06_release_and_operations/maintenance/MNT-{NNN}.md` (formato abajo) y cerrarlo cuando todos los hallazgos estén trazados.
2. Ejecutar `python3 .agents/scripts/check_spec_artifacts.py --changed`.

---

## Formato del Registro de Mantenimiento

```markdown
---
document: maintenance_review
id: MNT-NNN
version: 1.0.0
status: draft               # draft | closed
reviewed_on: AAAA-MM-DD
---

# MNT-NNN: Revisión de mantenimiento

## Dependencias y vulnerabilidades
## Deuda técnica
## Feature flags pendientes de retirar
## Operación
## Especificaciones y ciclo

## Hallazgos
- [Hallazgo accionable] — TK-XXX
- [Hallazgo descartado] — sin acción — [motivo]
```

Si una revisión no encuentra nada, la sección Hallazgos dice `Sin hallazgos.` y explica qué se revisó.
