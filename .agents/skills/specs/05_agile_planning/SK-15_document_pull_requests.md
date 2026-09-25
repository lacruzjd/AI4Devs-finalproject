---
name: pull-requests
description: "Documenta e inspecciona el historial veraz de entregas —Pull Requests, commits y Quality Gates (DoD) de CI/CD— sin invención de metadatos, actualizando README.md y 15_history.md, y es la dueña del Registro de Release que el workflow 10 escribe y el gate release verifica."
version: "3.2.0"
category: "05_agile_planning"
inputs:
  - "git_log_and_pr_data"
  - "docs/05_agile_planning/12_tickets/"
  - "docs/05_agile_planning/13_matriz_trazabilidad.md"
outputs:
  - "README.md"
  - "docs/05_agile_planning/15_history.md"
  - "docs/06_release_and_operations/releases/vX.Y.Z.md"
  - "CHANGELOG.md"
---

# SK-15: Registro de Pull Requests, Integración Continua y Releases (v3.2.0)

Actúa como un **Lead DevOps & Release Manager** experto en inspección de repositorios Git, flujos de trabajo basados en Pull Requests (PRs), integración continua y trazabilidad de entrega.

Tu objetivo es inspeccionar el repositorio real mediante comandos Git (`git log`, `git branch`), correlacionar las entregas con los tickets técnicos (`docs/05_agile_planning/12_tickets/`) y registrar el historial de Pull Requests en `README.md` y `docs/05_agile_planning/15_history.md`.

---

## Non-Goals de Ejecución del Agente (Guards)

Durante la ejecución de este skill, el agente TIENE PROHIBIDO:
1. **Prohibición Total de Invención de Historial:** Queda terminantemente prohibido inventar Pull Requests, ramas, IDs de tickets o resultados de pruebas. Todo registro debe estar respaldado por evidencia verificable en `git log`, GitHub CLI (`gh pr list`) o logs de CI/CD. Si un dato no se puede verificar, marcarlo explícitamente como `"No verificable"`.
2. **No alterar títulos ni nombres de ramas verbatim:** Registrar exactamente el título y nombre de la rama tal como figura en Git/GitHub, sin normalizar ni reescribir metadatos pasados.
3. **No registrar PRs con Quality Gates en rojo:** Si la suite de CI o el comando de test declarado en `AGENTS.md` fallaron en la integración, declarar la disconformidad en la ficha de la PR.

---

## Pipeline de Ejecución Secuencial en 4 Pasos

### Paso 1: Inspección de Git e Inicialización de Contexto
1. Ejecutar comandos de lectura local: `git log --oneline -n 15` y `git branch -a`.
2. Identificar commits de merge, Pull Requests abiertas/cerradas y su vinculación con los tickets del backlog (`TK-XXX`).

### Paso 2: Generación de Fichas de Pull Request
Para cada PR real verificada, estructurar la ficha de entregables:
- **PR #[Número]: [Título Verbatim de la PR]**
- **Ramas:** `[nombre-rama-origen]` → `main`.
- **Ticket Relacionado:** ID del ticket en el backlog (`TK-XXX`).
- **Descripción del Cambio:** Resumen de archivos modificados clasificados por capas Hexagonales (`Domain`, `Application`, `Infrastructure`).
- **Quality Gates (Definition of Done):** Verificación de compilación limpia, linters passing y suite de tests en verde, usando los comandos declarados en `AGENTS.md`.

### Paso 3: Actualización Documental
1. Actualizar la sección de Histórico de Pull Requests en `README.md`.
2. Registrar el log inmutable en `docs/05_agile_planning/15_history.md`.

### Paso 4: Registro del Release (lo invoca el [workflow 10](../../../workflows/10_release_workflow.md))
Este paso no se ejecuta por su cuenta: lo invoca el workflow de release en su Paso 8, una vez fijada la versión y pasados los gates previos. Aquí vive el **formato**; el workflow decide **cuándo**.

1. Escribir `docs/06_release_and_operations/releases/vX.Y.Z.md` con `status: planned` y el formato de abajo. Los datos salen de lo ya decidido en el workflow (versión, tickets cerrados, estrategia, migraciones, rollback) — prohibido inferir o rellenar un campo que el humano no confirmó.
2. Añadir la sección `## [X.Y.Z] - AAAA-MM-DD` a `CHANGELOG.md` en la raíz, con las notas **en lenguaje de usuario**: qué pueden hacer ahora, qué cambió, qué se corrigió. Sin nombres de clases ni identificadores de ticket en el texto principal.
3. Al desplegar, actualizar el registro a `status: deployed` con `deployed_at` y la sección de verificación posterior. Si hubo vuelta atrás, `status: rolled_back`.
4. Un proyecto que use otra convención de versionado la adapta al instalar momoy: el gate `release` comprueba exactamente la de este paso (archivo `CHANGELOG.md` en la raíz con formato Keep a Changelog y etiquetas `vX.Y.Z` sobre el commit desplegado).

#### Formato del Registro de Release

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

---

## Formato de Salida y Cabecera GFM

El archivo `docs/05_agile_planning/15_history.md` debe incluir la cabecera:

```markdown
---
document: pr_history
version: 1.0.0
status: approved
inputs:
  - git_log_and_pr_data
  - docs/05_agile_planning/13_matriz_trazabilidad.md
---

# Historial de Pull Requests e Integración Continua

> **Navegación del Framework SDD:**  
> [← Volver a Mapa Jerárquico (14_backlog_map.md)](./14_backlog_map.md) | [Glosario & Reglas](../../../../docs/01_product_definition/01_glosario_y_reglas_negocio.md) | [Inicio del Framework (01_glosario_y_reglas_negocio.md) →](../../../../docs/01_product_definition/01_glosario_y_reglas_negocio.md)

---
```
