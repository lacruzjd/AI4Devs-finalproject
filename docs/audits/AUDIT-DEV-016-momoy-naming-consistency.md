# 📊 Informe de Análisis — Consistencia de Nomenclatura en momoy (`.agents/`)

* **ID Auditoría:** AUDIT-DEV-016
* **Fecha:** 2026-09-18
* **Reviewer:** Agente principal (análisis solicitado por el humano — *"en cuanto a momoy hay un desorden en los prefijos de los archivos, no hay consistencia"*)
* **Alcance:** los 120 archivos versionados bajo `.agents/` — `skills/`, `workflows/`, `rules/`, `examples/`, `scripts/` y la raíz.
* **Método:** inventario exhaustivo (`find`), verificación de la convención declarada en [`.agents/CONTRIBUTING.md`](../../.agents/CONTRIBUTING.md), y medición del radio de impacto de cada renombrado con `grep -rl` / `grep -rho` sobre todo el repositorio (excluyendo `node_modules`).

---

## Resumen

La percepción del humano es correcta, pero el problema no es uno solo. Son **tres problemas distintos** con costes de remediación muy diferentes, y sólo uno de ellos justifica tocar archivos de forma masiva. Lo que está documentado en `CONTRIBUTING.md` se cumple; lo que no está documentado ha derivado.

| Clase | Hallazgos | Coste de cierre |
| :-- | :-- | :-- |
| A — El prefijo `NN_` significa cinco cosas distintas | F-1, F-2, F-3 | Bajo (documentación) |
| B — Sufijos rotos dentro de una misma familia | F-4, F-5, F-6 | Bajo (~35 ocurrencias) |
| C — Dos generaciones de nomenclatura conviviendo en `skills/` | F-7 | Alto (244 ocurrencias) |

---

## Parte 1 — Qué codifica hoy el prefijo numérico

| Directorio | Significado real del `NN_` | ¿Documentado? | Veredicto |
| :-- | :-- | :-- | :-- |
| `workflows/` | Orden de ejecución del ciclo VSDD; `00` reservado a meta / una sola ejecución | ✅ `CONTRIBUTING.md` §Workflows | Correcto |
| `skills/specs/NN_fase/` | Espejo literal de la taxonomía de `docs/NN_fase/` | ❌ (implícito) | Correcto, sin documentar |
| `skills/development/NN_fase/` | Agrupación por orden de creación, sin criterio estable | ❌ | **F-2** |
| `rules/NN_` | Nada. Es la fecha de alta disfrazada de orden | ❌ (no hay sección de rules en `CONTRIBUTING.md`) | **F-1** |
| `examples/NN_` | Secuencia **global que cruza subcarpetas** | ❌ | **F-3** |
| `SK-NN` | ID global cronológico, independiente de su carpeta | ✅ `CONTRIBUTING.md` §Skills | Correcto |

### Hallazgos de la Parte 1

| ID | Sev. | Descripción | Evidencia |
| :-- | :-- | :-- | :-- |
| **F-1** | 🔵 Baja | El `NN_` de `rules/` no codifica orden ni prioridad: es estrictamente la fecha de creación (`00`→15-ago, `01`/`02`→17-ago, `03`→19-ago, `04`→21-ago, `05`→22-ago, verificado con `git log --diff-filter=A`). Ningún documento describe qué significa, porque `CONTRIBUTING.md` **no tiene sección para añadir una rule**. | `git log` sobre los 6 ficheros de `.agents/rules/` |
| **F-2** | 🔵 Baja | La taxonomía de `skills/development/` solapa consigo misma: `08_testing` contiene `SK-34` (model-based testing) mientras `05_quality_and_lint` contiene `SK-24` (characterization testing) y `SK-32` (fixture builder). Un agente no puede decidir dónde va una skill de pruebas nueva. | `ls .agents/skills/development/` |
| **F-3** | 🟡 Media | La numeración de `examples/` es global en vez de local a su subcarpeta: `backend/01_`, `backend/02_`, `frontend/03_`. Añadir un tercer ejemplo de backend obliga a renumerar `frontend/`, o a dejar un hueco permanente. Es la única convención del árbol que **se rompe al usarla**. | `find .agents/examples -type f` |

---

## Parte 2 — Sufijos rotos

| ID | Sev. | Descripción | Radio de impacto medido |
| :-- | :-- | :-- | :-- |
| **F-4** | 🔵 Baja | 12 de 14 workflows terminan en `_workflow.md`; `06_full_qa_pipeline.md` y `08_smoke_test_deploy_validation.md` no. | 28 ocurrencias en 17 ficheros |
| **F-5** | 🔵 Baja | El sufijo `.example.md` se aplica en las subcarpetas (`01_use_case_pattern.example.md`) pero no en la raíz (`00_few_shot_patterns.md`), pese a ser los cuatro el mismo tipo de artefacto. | 8 ocurrencias en 6 ficheros |
| **F-6** | 🔵 Baja | `scripts/` no tiene convención escrita. Hay una familia `check_*` (5 `.py` + 1 `.sh`) y tres scripts sin prefijo (`validate_agents.sh`, `install.sh`, `sync_claude_skills.sh`). El mixto `.py`/`.sh` dentro de la familia `check_*` obliga a `validate_agents.sh` a invocarlos de dos maneras distintas. | Bajo (uso interno) |

---

## Parte 3 — Dos generaciones conviviendo en `skills/`

| ID | Sev. | Descripción |
| :-- | :-- | :-- |
| **F-7** | 🟡 Media | `.agents/skills/` mezcla en un mismo nivel **25 comandos** `momoy-*/SKILL.md` (kebab-case, estándar abierto Agent Skills) y **2 contenedores de procedimientos** `specs/` y `development/` (snake_case numerado, `SK-NN`). Son dos artefactos de naturaleza distinta — interfaz pública vs. biblioteca de procedimientos — indistinguibles por su ubicación. El propio validador ya lo reconoce: `check_skill_standard.py` los declara `LEGACY_CONTAINERS` para poder exceptuarlos de la especificación. |

---

## Lo que NO debe cambiarse

**Renumerar o renombrar los `SK-NN` está descartado.** Medición: **386 ocurrencias en 74 ficheros**, y **40 ficheros de `docs/`** citan rutas `.agents/`. El ID es una clave estable referenciada por la Matriz de Trazabilidad, el `CHANGELOG.md` de momoy y los docs del proyecto consumidor. La consecuencia aceptada es que en `skills/development/05_quality_and_lint/SK-19_*.md` los dos números no correlacionan — se cierra documentándolo (F-1), no renombrando.

---

## Principio propuesto

> El prefijo numérico sólo se usa cuando codifica **orden de ejecución** o **espejo de una taxonomía externa**. En todo lo demás el nombre manda, y el número es un **ID estable**, nunca una posición.

---

## Plan de tickets

| Ticket | Cierra | Alcance |
| :-- | :-- | :-- |
| [`TK-150`](../05_agile_planning/12_tickets/shared/backend/TK-150.md) | F-1, F-2 | Escribir el estándar en `CONTRIBUTING.md`: principio, secciones faltantes (rules, examples, scripts), y la independencia declarada entre `NN_` de carpeta y `SK-NN`. |
| [`TK-151`](../05_agile_planning/12_tickets/shared/backend/TK-151.md) | F-3, F-4, F-5, F-6 | `check_naming.py` escrito **primero y visto en rojo**, luego los renombrados que lo ponen en verde, y su wireado en `validate_agents.sh`. |
| [`TK-152`](../05_agile_planning/12_tickets/shared/backend/TK-152.md) | F-7 | Separar comandos de procedimientos (`.agents/procedures/`). **`backlog` — pendiente de decisión humana explícita**, por su coste. |

---

## Conclusión

El árbol no está desordenado de forma homogénea: **lo que `CONTRIBUTING.md` documenta se respeta sin excepciones**, y todo lo que ha derivado (F-1, F-3, F-6) es exactamente lo que ese fichero no cubre. La causa raíz no es descuido, es ausencia de estándar escrito y de gate que lo verifique — el mismo patrón que `TK-147` cerró para el gate de dependencias. Por eso `TK-150` (documentar) precede a `TK-151` (verificar y corregir), y no al revés.
