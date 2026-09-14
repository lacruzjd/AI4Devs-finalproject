# Contribuir a momoy (`.agents/`)

`.agents/` es agnóstico y portátil — estas reglas mantienen esa promesa cuando se añade o modifica una skill, workflow o regla.

---

## Añadir una nueva Skill

1. **ID secuencial sin huecos ni duplicados.** Las skills se numeran de forma correlativa desde `SK-01`, sin saltos (el total actual lo reporta `validate_agents.sh`; no se anota aquí para que no quede obsoleto). Antes de crear una nueva, corre `bash .agents/scripts/validate_agents.sh` para confirmar el siguiente ID libre — el script falla si detecta un ID duplicado y avisa (no bloqueante) si hay huecos.
2. **Ubicación por fase y rol**, no por conveniencia:
   - `skills/specs/<NN>_<fase>/` para skills de la Fase Documental (Product Owner / Architect).
   - `skills/development/<NN>_<fase>/` para skills de Codificación y Calidad (Developer / QA / DevSecOps).
3. **Frontmatter YAML obligatorio** con estos campos exactos (ver cualquier `SK-*.md` existente como referencia):
   ```yaml
   ---
   name: SK-NN_nombre_snake_case
   description: "Una línea, en español, describiendo qué hace y qué garantiza."
   version: "1.0.0"
   category: "specs/<NN>_<fase>" | "development/<NN>_<fase>"
   inputs:
     - campo: "descripción"
   required_rules:
     - "docs/04_governance_and_quality/rules/<archivo>.md"
   outputs:
     - "Artefacto concreto que produce"
   ---
   ```
   Cada ruta en `required_rules` DEBE existir en el repo — `check_links.py` lo valida en CI y falla si no.
4. **Registrar la skill en `README.md`** (sección 4, catálogo) con su enlace relativo.
5. **Versionado semántico independiente por skill.** Cambios de comportamiento incompatibles → MAJOR; nuevas fases/checklist → MINOR; correcciones de redacción → PATCH.

## Añadir o modificar un Workflow

1. Los workflows viven en `workflows/` numerados en orden de ejecución del ciclo VSDD, no por fecha de creación — con una excepción explícita: **`00` está reservado para documentos de una sola ejecución o meta-nivel** (`00_master_vsdd_workflow.md` es el mapa general; `00_greenfield_bootstrap_workflow.md` corre una única vez por proyecto, antes de que exista `docs/00_stack_manifest.md`). **`01` en adelante numeran el ciclo repetible** (spec → dev → auditoría → QA → producción → verificación → release) que se ejecuta una y otra vez por cada idea, ticket o entrega. Un nuevo workflow repetible se añade con el siguiente número libre; un nuevo workflow de una sola vez/meta-nivel se añade con prefijo `00_<algo>_workflow.md`.
2. Todo workflow que invoque skills debe enlazarlas con su ruta relativa completa, por ejemplo:
   ```markdown
   [SK-16: Desarrollador de Tickets Backend](../skills/development/02_backend_development/SK-16_develop_backend_ticket.md)
   ```
   Enlaces rotos son detectados por `check_links.py`.
3. Si el workflow introduce una etapa nueva del ciclo de vida, actualiza el diagrama Mermaid en [00_master_vsdd_workflow.md](workflows/00_master_vsdd_workflow.md).

## Añadir o modificar un Comando

Los comandos (`/momoy`, `/momoy-*`) son la interfaz pública de momoy: siguen el estándar abierto [Agent Skills](https://agentskills.io/specification) para que Antigravity, Codex, Gemini CLI y Claude Code los descubran sin adaptadores por herramienta.

1. **Ubicación y nombre:** `skills/<nombre>/SKILL.md`, con `name` igual al directorio, en minúsculas y guiones, y el prefijo `momoy-` reservado (evita chocar con comandos nativos como `/init` o `/code-review`).
2. **Solo campos portables en el frontmatter:** `name`, `description`, `license`, `metadata`. `description` dice **qué hace y cuándo usarlo** (y cuándo no), en una sola línea de hasta 1024 caracteres, y termina con "Solo por invocación explícita del usuario." — es la única señal que Antigravity y Gemini tienen para no activarlo solos.
3. **Punto de entrada delgado:** el cuerpo declara la entrada esperada y referencia el workflow, script o procedimiento `SK-NN` que ejecuta (`.agents/workflows/...`, `.agents/skills/specs|development/.../SK-NN_*.md`); nunca copia el procedimiento ni apunta a otro comando. Si ambos discrepan, manda lo referenciado. **Ningún paso, pausa ni regla propia vive en el comando**: si hace falta, se añade al procedimiento, para que también lo reciba quien lo invoque sin skills. El cuerpo es solo `**Entrada:**`, una frase de delegación y las reglas estándar.
4. **Invocación explícita en cada herramienta:** `agents/openai.yaml` con `policy.allow_implicit_invocation: false` (Codex). Para Claude Code no se edita la fuente: `sync_claude_skills.sh` genera la copia en `.claude/skills/` con `disable-model-invocation: true` — córrelo tras añadir o renombrar un comando.
5. **Registrar el comando** en la tabla de la sección 2 de `README.md`.
6. **Filtro antes de crear uno:** (a) tiene un disparador humano propio, (b) se usa fuera de un workflow, (c) ningún comando existente lo cubre y (d) el procedimiento que ejecuta ya existe. Si falla (a), (b) o (c), no es un comando — y si una skill `SK-NN` no la invoca ningún workflow pese a no tener uso independiente, lo que falta es cablearla, no un comando. Si solo falla (d), el comando se crea junto con su procedimiento, nunca antes.

Verificado por `check_skill_standard.py` (wireado en `validate_agents.sh`). Los procedimientos `SK-NN` de `skills/specs/` y `skills/development/` **no** son comandos: los invocan los workflows.

## Antes de proponer el cambio

Ejecuta siempre, desde la raíz del repo:
```bash
bash .agents/scripts/validate_agents.sh
```
Esto corre los tests unitarios de las propias herramientas de auditoría, verifica enlaces markdown, `required_rules` del frontmatter, unicidad de IDs, **que ningún script bajo `.agents/scripts/` se haya acoplado al stack de un proyecto (`check_agnosticism.py`, ver regla abajo)**, **que no se reintroduzcan emojis decorativos (`check_emoji_policy.py`, ver regla abajo)** y **que los comandos cumplan el estándar Agent Skills (`check_skill_standard.py`, ver arriba)**. Un PR que lo rompe no se fusiona — está wireado en `ci.yml`.

Además, ningún PR a `.agents/` (aunque `validate_agents.sh` pase en verde) se considera gobernanza vigente hasta que un humano confirmó explícitamente su diff — `.agents/` está sujeto al mismo modelo de amenaza de contenido no confiable que `docs/`, ver [`rules/03_untrusted_content_standard.md`](rules/03_untrusted_content_standard.md) Regla 5.

## Qué NO hacer (Non-Goals)

Aplican las mismas guardas que rigen el código generado por las skills ([rules/README.md](rules/README.md)):
- No hardcodear rutas o convenciones de un proyecto específico dentro de una skill/script si se puede inferir de `AGENTS.md` o `docs/` del proyecto consumidor — eso rompe la portabilidad.
- No añadir una skill que duplique el alcance de otra existente; extiende la existente con una nueva fase antes de crear una paralela.
- No fusionar una skill sin `required_rules` verificables ni un `output` concreto y verificable.

### `.agents/scripts/` es SOLO tooling universal (regla permanente)

`install.sh` copia `.agents/` **verbatim** (`cp -R`) a cualquier proyecto nuevo, sin importar su stack — así que ningún archivo bajo `.agents/scripts/` puede depender del lenguaje, gestor de paquetes, test runner o layout de directorios que un proyecto consumidor haya elegido. Un script ahí solo puede operar sobre (a) la estructura propia de `.agents/` (skills, workflows, rules), o (b) la taxonomía fija de `docs/` que el propio framework VSDD impone a cualquier proyecto (ej. `docs/02_architecture_design/03_domain_model.md` — mismo path en cualquier stack).

Cualquier script de gobernanza cuya lógica sí dependa del stack real (linter, test runner, contrato de API, layout de monorepo) **DEBE generarse por skill** (ej. `SK-27_extract_project_rules.md`) hacia el árbol del **proyecto consumidor** (ej. `docs/04_governance_and_quality/scripts/`), adaptado al stack declarado en `docs/00_stack_manifest.md` — nunca vivir como archivo estático en `.agents/scripts/`. Verificado automáticamente por `.agents/scripts/check_agnosticism.py` (wireado en `validate_agents.sh`), que recorre `.agents/scripts/` **de forma recursiva** (excluyendo `tests/` y `__pycache__` a cualquier profundidad) y falla si detecta: binarios de gestor de paquetes (`npx`, `pnpm`, `npm`, `pip`, `cargo`...) o rutas de proyecto hardcodeadas dentro de cualquier `*.sh`/`*.py`, **o cualquier archivo con una extensión fuera de la allowlist `.sh`/`.py`/`.md`** — la vía más simple de acoplarse a un stack es escribir el script en otro lenguaje por completo, y ningún substring bloqueado lo detectaría; esto cierra un blind spot que estuvo documentado sin resolver durante varias versiones.

### La documentación tampoco se acopla a un proyecto (momoy 2.26.1)

momoy se instala en proyectos que no conocen el historial de ningún otro. En skills, workflows, rules y comentarios de scripts:

- **No citar identificadores del historial de un proyecto** (un ticket, historia o requisito con su número real, el código de una auditoría o de un postmortem): en otro proyecto no significan nada o coinciden con los suyos. Se describe la lección, no su ID; la procedencia vive en el `CHANGELOG.md`. Los placeholders (`TK-XXX`, `TK-NNN`) y la convención de tickets base (`TK-001`, `TK-001-FE`) sí están permitidos.
- **No citar guardias por su número** (la palabra *Guard* seguida de una cifra): cada `AGENTS.md` numera las suyas (`SK-27` lo advierte). Se citan por su nombre o se remite a la regla de momoy correspondiente. Para los propios no-goals de una skill se escribe "Non-Goal N".
- **No usar ejemplos del dominio de un proyecto** ni su layout de carpetas (por ejemplo, las rutas de un monorepo concreto).

Verificado por la segunda pasada de `.agents/scripts/check_agnosticism.py`, **bloqueante** en `validate_agents.sh` (`--strict-docs`); ejecutado a mano sin ese flag es informativa, y `--verbose` lista los hallazgos.

### Sin emojis decorativos (regla permanente, momoy 2.17.0)

momoy es un framework de gobernanza, no un post de blog: los emojis decorativos no aportan información, añaden ruido visual y rompen búsquedas literales sobre títulos. Dos reglas:

1. **Ningún título lleva emoji** (`#` a `######`), ni siquiera un marcador de estado. Aplica también a los títulos de las plantillas que una skill ordena generar.
2. **En el cuerpo de skills, workflows, rules, examples y scripts solo se admiten estos 8 marcadores semánticos**, siempre con su significado fijo:

   | Marcador | Significado |
   |---|---|
   | 🟢 | Éxito / completado |
   | 🟡 | Requiere revisión humana / severidad media |
   | 🟠 | Severidad alta |
   | 🔴 | Rechazado / severidad crítica |
   | 🔵 | Severidad baja |
   | ✅ | Gate o verificación pasó |
   | ❌ | Gate o verificación falló |
   | ⚠️ | No verificable / advertencia |

   Para flujos y navegación se usan flechas tipográficas (`→`, `←`), no pictográficas.

Verificado automáticamente por `.agents/scripts/check_emoji_policy.py` (wireado en `validate_agents.sh`). `CHANGELOG.md` está exento porque es historial inmutable; `tests/` y `__pycache__` se excluyen. La detección de títulos es por línea: un comentario `# ...` dentro de un bloque de código en un `.md` cuenta como título.

## Git hook `commit-msg`

Todo commit debe referenciar un ticket `TK-XXX` en el mensaje (ej. `[TK-NNN]`) — lo exige `.husky/commit-msg`, instalado automáticamente vía `pnpm install` (script `prepare`). Excepciones: commits `Merge`/`Revert` automáticos de git, o un bypass explícito añadiendo `[skip-tk]` al mensaje para casos deliberados fuera del ciclo VSDD.

## Licencia

Toda contribución a `.agents/` se distribuye bajo los términos de [LICENSE](LICENSE) (MIT).
