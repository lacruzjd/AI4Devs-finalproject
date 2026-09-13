---
name: 10_release_workflow
description: "Workflow de release: lleva un conjunto de tickets cerrados a producción sin riesgo. Fija la versión SemVer, pasa los gates previos, declara la estrategia de liberación, clasifica las migraciones, verifica la configuración de despliegue, planifica y ensaya el rollback cuando corresponde, escribe las notas de versión y solo despliega con aprobación humana, validando después con el workflow 08."
version: "1.0.0"
category: "workflows/deployment"
---

# Workflow 10: Release (v1.0.0)

> **DIRECTIVA PARA EL AGENTE:**
> Actúa como un **Release Manager** con mentalidad SRE. Desplegar es poner el código en producción; liberar es que el usuario lo vea. Tu trabajo es que ambos pasos sean predecibles, verificados y reversibles.
>
> **FASE 0 OBLIGATORIA (Guard 24):** lee `docs/00_stack_manifest.md`: plataforma, entornos, mecanismo de despliegue, mecanismo para volver a la versión anterior y herramienta de feature flags si existe. Si algo de esto no está declarado, detente y pregunta.
>
> **Nada llega a producción sin aprobación humana explícita** (Paso 9), y ningún rollback se ejecuta sin ella ([workflow 08](08_smoke_test_deploy_validation.md), Paso 4).

El registro del release vive en `docs/06_release_and_operations/releases/vX.Y.Z.md` (formato al final) y lo verifica el gate `release` de `.agents/scripts/check_spec_artifacts.py`.

---

## Paso 1 — Alcance y Versión

1. Listar los tickets en estado `done` desde el último release registrado. Un ticket que no esté `done` no entra.
2. Proponer la **versión SemVer del producto**:
   - **MAJOR:** cambio incompatible para quien usa el sistema (contrato de API que rompe clientes, datos que cambian de significado).
   - **MINOR:** capacidad nueva compatible.
   - **PATCH:** correcciones sin capacidad nueva.
3. Confirmar la versión con el humano antes de seguir.

## Paso 2 — Gates Previos

1. `python3 .agents/scripts/check_spec_artifacts.py --changed` y los gates de calidad y seguridad del proyecto declarados en `AGENTS.md` (build, lint, tests, auditoría de dependencias con `/momoy-deps`).
2. Cualquier gate en rojo detiene el release. No se "libera ahora y se arregla después".

## Paso 3 — Estrategia de Liberación

Declarar **una estrategia para todo el release** (`strategy`):

| Estrategia | Cuándo | Requisito |
| :--- | :--- | :--- |
| `flag` | El cambio puede desplegarse apagado y encenderse después | Cada flag tiene su **ticket de retirada** (`SK-12`) antes de desplegar |
| `canary` | La plataforma permite exponer la versión a una parte del tráfico | Criterio de ampliación y de vuelta atrás escritos antes de empezar |
| `completo` | Todo el tráfico a la vez | **Justificación explícita** (ej. sin usuarios aún, cambio interno sin impacto visible, plataforma de una sola instancia) |

## Paso 4 — Migraciones

Si el release incluye cambios de esquema o de datos (`includes_migration: si`), clasificar cada migración según el patrón expand-contract de [`SK-06`](../skills/specs/03_persistence_and_api/SK-06_design_database_schema.md):

- `expand`: añade estructura compatible; el código anterior sigue funcionando con el esquema nuevo. Es la única que permite volver al código anterior sin tocar datos.
- `contract`: elimina la estructura antigua. **Solo puede ir en un release posterior** al que desplegó su `expand`, y debe citar esa versión (`contract: … — expand en vA.B.C`).
- `datos`: transforma o rellena datos. Requiere confirmar con el humano cómo se recuperan si hay que volver atrás.

## Paso 5 — Verificación Previa de la Configuración de Despliegue

1. Validar la configuración de despliegue con la herramienta de la plataforma (validación del blueprint, `plan`, dry-run) antes de desplegar.
2. **Toda variable con forma de URL tiene esquema**, y todo valor que resuelve la plataforma (referencias a otros servicios, hosts internos) se verifica contra su documentación o un despliegue de prueba, nunca se supone. Lección de `PM-001`: una referencia que devolvía hosts sin esquema tumbó el primer despliegue.
3. Si la configuración de despliegue cambió en este release, `changes_deploy_config: si`.

## Paso 6 — Plan de Rollback y Ensayo

1. Escribir cómo se vuelve a la versión anterior con el mecanismo declarado: qué se ejecuta, cuánto tarda y qué pasa con los datos.
2. **Ensayo obligatorio** si `includes_migration: si` o `changes_deploy_config: si`: ejecutar el rollback en un entorno previo (staging, entorno efímero o el mecanismo equivalente declarado) y registrar `rollback_rehearsed_on` con la evidencia. Sin ensayo, el release no pasa el gate.
3. Prohibido plantear como rollback destruir infraestructura o revertir datos sin aprobación humana.

## Paso 7 — Notas de Versión

1. Redactar las notas **en lenguaje de usuario**: qué pueden hacer ahora, qué cambió, qué se corrigió. Sin nombres de clases ni de tickets en el texto principal.
2. Añadir la sección `## [X.Y.Z] - AAAA-MM-DD` al `CHANGELOG.md` del proyecto (formato Keep a Changelog).

## Paso 8 — Registro del Release y Gate

1. Escribir `docs/06_release_and_operations/releases/vX.Y.Z.md` con `status: planned` (formato abajo).
2. `python3 .agents/scripts/check_spec_artifacts.py --changed` debe pasar sin hallazgos del gate `release`.

## Paso 9 — PAUSA HitL: Go / No-Go

Presentar al humano versión, tickets, estrategia y justificación, migraciones, verificación de configuración, plan y ensayo de rollback, y notas de versión. **Detenerse.** Solo con un "sí" explícito se despliega.

## Paso 10 — Despliegue

1. Desplegar con el mecanismo declarado en el stack manifest.
2. Crear la etiqueta `vX.Y.Z` sobre el commit desplegado (publicarla requiere la misma aprobación del Paso 9).

## Paso 11 — Validación Posterior

1. Ejecutar el [workflow 08](08_smoke_test_deploy_validation.md).
2. **PASS:** `status: deployed`, `deployed_at` y la sección "Verificación posterior" con el resultado. El gate `release` comprueba que la etiqueta `vX.Y.Z` y la sección del `CHANGELOG.md` existen.
3. **FAIL:** el workflow 08 propone el rollback y espera la aprobación humana; tras ejecutarlo, `status: rolled_back` y se abre la incidencia con el workflow 07 (severidad `alta`, con postmortem).
4. Si la estrategia es `flag`, recordar al humano los tickets de retirada de cada flag.

---

## Formato del Registro de Release

```markdown
---
document: release
release: X.Y.Z
version: 1.0.0
status: planned              # planned | deployed | rolled_back | cancelled
strategy: completo           # completo | flag | canary
strategy_justification: "Obligatoria si strategy es completo"
planned_on: AAAA-MM-DD
deployed_at:                 # AAAA-MM-DDTHH:MM:SS±HH:MM al desplegar
includes_migration: no       # si | no
changes_deploy_config: no    # si | no
rollback_rehearsed_on:       # AAAA-MM-DD; obligatorio si hay migración o cambio de despliegue
---

# Release vX.Y.Z

## Tickets incluidos
- TK-XXX — [título]

## Notas de versión
[Qué cambia para el usuario, en su lenguaje.]

## Migraciones
- expand: [descripción]
- contract: [descripción] — expand en vA.B.C

## Feature flags
- [nombre del flag] — retirada en TK-XXX

## Verificación previa al despliegue
[Validación de la configuración y de los valores que resuelve la plataforma.]

## Plan de rollback
[Cómo se vuelve a la versión anterior, cuánto tarda, qué pasa con los datos y evidencia del ensayo si aplica.]

## Verificación posterior
[Al desplegar: resultado del workflow 08.]
```

Las secciones Migraciones y Feature flags solo son obligatorias si hay migraciones o la estrategia es `flag`; Verificación posterior, solo al desplegar.
