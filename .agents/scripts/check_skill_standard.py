#!/usr/bin/env python3
"""Guarda de conformidad de los comandos de momoy con el estándar abierto Agent Skills.

Los comandos de momoy (`/momoy`, `/momoy-dev`, ...) viven en `.agents/skills/<nombre>/SKILL.md`,
la ruta que descubren Antigravity, Codex y Gemini CLI (y que `sync_claude_skills.sh` replica
en `.claude/skills/` para Claude Code). Un `SKILL.md` que no cumple la especificación
(https://agentskills.io/specification) simplemente no aparece como comando en esas
herramientas, sin ningún error visible — por eso se verifica aquí y no por revisión humana.

Reglas para cada subdirectorio directo de `.agents/skills/`:

1. Contiene `SKILL.md` con frontmatter YAML. Única excepción: los contenedores del catálogo
   de procedimientos internos `SK-NN` (LEGACY_CONTAINERS), que no son skills del estándar.
2. Solo usa campos del estándar portable: name, description, license, compatibility,
   metadata, allowed-tools. Los campos propios de una herramienta (ej.
   `disable-model-invocation` de Claude Code) se inyectan en la copia que genera
   `sync_claude_skills.sh`, nunca en la fuente.
3. `name`: 1-64 caracteres, minúsculas/dígitos/guiones, sin guion inicial/final ni doble
   guion, e igual al nombre del directorio.
4. `description`: 1-1024 caracteres, en una sola línea (este chequeo no interpreta bloques
   YAML multilínea).
5. El archivo no supera MAX_LINES (recomendación del estándar).

Reglas adicionales para los comandos de momoy (nombre `momoy` o `momoy-*`):

6. Referencian al menos una ruta que existe: un workflow (`.agents/workflows/...`), un script
   (`.agents/scripts/...`) o un procedimiento SK-NN (`.agents/skills/specs|development/.../SK-NN_*.md`).
   El comando es un punto de entrada; la fuente de verdad es lo que referencia. Nunca otro
   comando: encadenar comandos esconde el procedimiento real.
7. Declaran `agents/openai.yaml` con `allow_implicit_invocation: false`: un agente no debe
   lanzar por su cuenta una cascada que la gobernanza de momoy exige aprobar.
8. **Son delgados.** Un comando es entrada + una frase de delegación + reglas estándar; toda
   regla o paso propio vive en el procedimiento, no aquí. Si la lógica vive en el comando, un
   asistente sin soporte de skills que use el workflow directamente no la recibe (en 2.20.0
   `/momoy` llevaba un diagnóstico entero y `/momoy-characterize` una pausa que SK-24 no tenía,
   y la regla 6 no lo detectaba porque solo pedía que la referencia existiera). Se exige:
   una línea `**Entrada:**` de hasta MAX_INPUT_CHARS; cuerpo de delegación de hasta
   MAX_BODY_LINES líneas y MAX_BODY_CHARS caracteres; y en `## Reglas del comando`, solo
   viñetas que empiecen por uno de los RULE_PREFIXES estándar.
"""
import os
import re
import sys

STANDARD_FIELDS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
LEGACY_CONTAINERS = {"specs", "development"}
NAME_REGEX = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_NAME = 64
MAX_DESCRIPTION = 1024
MAX_LINES = 500
FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.S)
TOP_LEVEL_KEY = re.compile(r"^([A-Za-z0-9_-]+):(.*)$")
ENTRYPOINT_REFERENCE = re.compile(
    r"\.agents/(?:workflows|scripts)/[A-Za-z0-9_./-]+\.(?:md|sh|py)"
    r"|\.agents/skills/(?:specs|development)/[A-Za-z0-9_./-]*SK-\d+_[A-Za-z0-9_-]+\.md"
)
IMPLICIT_OFF = re.compile(r"^\s*allow_implicit_invocation:\s*false\s*$", re.M)
MAX_INPUT_CHARS = 220
MAX_BODY_LINES = 2
MAX_BODY_CHARS = 350
RULES_HEADING = "## Reglas del comando"
RULE_PREFIXES = (
    "- Este archivo es solo un punto de entrada",
    "- Respeta cada pausa de aprobación humana",
    "- Si el procedimiento genera código",
)


def _is_momoy_command(name):
    return name == "momoy" or name.startswith("momoy-")


def _parse_frontmatter(text):
    match = FRONTMATTER.match(text)
    if not match:
        return None
    fields = {}
    for line in match.group(1).splitlines():
        key_match = TOP_LEVEL_KEY.match(line)
        if key_match:
            fields[key_match.group(1)] = key_match.group(2).strip().strip('"').strip("'")
    return fields


def _thinness_problems(text):
    """Devuelve la lista de motivos por los que un comando no es delgado (regla 8)."""
    problems = []
    body = text[text.index("\n---\n", 4) + 5:] if text.startswith("---\n") else text
    if RULES_HEADING not in body:
        return [f"falta la sección '{RULES_HEADING}'"]
    head, rules = body.split(RULES_HEADING, 1)
    lines = [l for l in head.splitlines() if l.strip() and not l.startswith("# ")]
    inputs = [l for l in lines if l.startswith("**Entrada:**")]
    if len(inputs) != 1:
        problems.append("debe tener exactamente una línea '**Entrada:**'")
    elif len(inputs[0]) > MAX_INPUT_CHARS:
        problems.append(f"la línea de entrada tiene {len(inputs[0])} caracteres (máximo {MAX_INPUT_CHARS})")
    delegation = [l for l in lines if not l.startswith("**Entrada:**")]
    if len(delegation) > MAX_BODY_LINES or sum(len(l) for l in delegation) > MAX_BODY_CHARS:
        problems.append(f"el cuerpo tiene {len(delegation)} líneas / {sum(len(l) for l in delegation)} caracteres "
                        f"(máximo {MAX_BODY_LINES} / {MAX_BODY_CHARS}): la lógica propia va en el procedimiento")
    for bullet in (l for l in rules.splitlines() if l.strip()):
        if not bullet.startswith(RULE_PREFIXES):
            problems.append(f"regla no estándar en el comando: '{bullet[:60]}...' — muévela al procedimiento")
    return problems


def run_checks(agents_dir):
    """Aplica las reglas del módulo a cada subdirectorio directo de `.agents/skills/`.

    Devuelve (checked_count, violation_count, messages) sin imprimir ni salir del
    proceso, para poder invocarse tanto desde CLI como desde tests.
    """
    checked_count = 0
    violation_count = 0
    messages = []

    skills_dir = os.path.join(agents_dir, "skills")
    if not os.path.isdir(skills_dir):
        return checked_count, violation_count, messages

    project_root = os.path.dirname(os.path.abspath(agents_dir))

    def fail(message):
        nonlocal violation_count
        violation_count += 1
        messages.append(f"❌ {message}")

    for entry in sorted(os.listdir(skills_dir)):
        skill_dir = os.path.join(skills_dir, entry)
        if not os.path.isdir(skill_dir) or entry == "__pycache__":
            continue

        skill_file = os.path.join(skill_dir, "SKILL.md")
        if not os.path.isfile(skill_file):
            if entry not in LEGACY_CONTAINERS:
                fail(f"skills/{entry}/ no contiene SKILL.md — no es descubrible como skill del estándar Agent Skills.")
            continue

        checked_count += 1
        rel = f"skills/{entry}/SKILL.md"
        with open(skill_file, encoding="utf-8", errors="ignore") as f:
            text = f.read()

        fields = _parse_frontmatter(text)
        if fields is None:
            fail(f"{rel}: falta el frontmatter YAML (--- ... ---) al inicio del archivo.")
            continue

        extra = sorted(set(fields) - STANDARD_FIELDS)
        if extra:
            fail(f"{rel}: campos fuera del estándar portable: {', '.join(extra)} — muévelos a 'metadata' o a la copia por herramienta.")

        name = fields.get("name", "")
        if not name:
            fail(f"{rel}: falta 'name'.")
        else:
            if len(name) > MAX_NAME or not NAME_REGEX.match(name):
                fail(f"{rel}: name '{name}' inválido — 1-{MAX_NAME} caracteres, minúsculas, dígitos y guiones simples.")
            if name != entry:
                fail(f"{rel}: name '{name}' no coincide con el directorio '{entry}'.")

        description = fields.get("description", "")
        if not description:
            fail(f"{rel}: falta 'description' (o no está en una sola línea).")
        elif len(description) > MAX_DESCRIPTION:
            fail(f"{rel}: description de {len(description)} caracteres supera el máximo de {MAX_DESCRIPTION}.")

        line_count = text.count("\n") + (0 if text.endswith("\n") else 1)
        if line_count > MAX_LINES:
            fail(f"{rel}: {line_count} líneas supera las {MAX_LINES} recomendadas — mueve el detalle a references/.")

        if not _is_momoy_command(entry):
            continue

        references = ENTRYPOINT_REFERENCE.findall(text)
        if not references:
            fail(f"{rel}: el comando no referencia ningún workflow, script o procedimiento SK-NN — debe ser un punto de entrada, no una copia del procedimiento.")
        for ref in sorted(set(references)):
            if not os.path.isfile(os.path.join(project_root, ref)):
                fail(f"{rel}: referencia rota '{ref}' — no existe.")

        for problem in _thinness_problems(text):
            fail(f"{rel}: comando no delgado — {problem}")

        openai_yaml = os.path.join(skill_dir, "agents", "openai.yaml")
        if not os.path.isfile(openai_yaml):
            fail(f"skills/{entry}/: falta agents/openai.yaml con 'allow_implicit_invocation: false'.")
        else:
            with open(openai_yaml, encoding="utf-8", errors="ignore") as f:
                if not IMPLICIT_OFF.search(f.read()):
                    fail(f"skills/{entry}/agents/openai.yaml: debe declarar 'allow_implicit_invocation: false'.")

    return checked_count, violation_count, messages


def main():
    agents_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    checked_count, violation_count, messages = run_checks(agents_dir)

    for msg in messages:
        print(msg)

    print(f"\nTotal de SKILL.md auditados contra el estándar Agent Skills: {checked_count}")
    print(f"Total de incumplimientos encontrados: {violation_count}")

    if violation_count > 0:
        sys.exit(1)
    else:
        print("✅ Los comandos de momoy cumplen el estándar Agent Skills.")


if __name__ == "__main__":
    main()
