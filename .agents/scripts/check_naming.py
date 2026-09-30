#!/usr/bin/env python3
"""Guarda de convención de nombres de momoy: el frontmatter se deriva de la ruta, nunca al revés.

Hasta 2.31.0 los procedimientos SK-NN usaban tres estilos de `name` (`prd-generation`,
`SK-16_develop_backend_ticket`, ...) y `category` apuntaba a veces a una carpeta que no existía
(`quality/01_testing` para un archivo en `development/08_testing/`); cinco workflows no tenían
frontmatter y cada uno titulaba a su manera. Ningún chequeo lo veía, porque nada leía esos campos
contra la ruta real. Si el frontmatter se deriva de la ruta, un script puede decidir si es correcto
sin criterio humano — por eso se verifica aquí.

Reglas para cada procedimiento `procedures/{specs,development}/<carpeta>/SK-NN_<slug>.md`:

1. `name` es el nombre del archivo sin extensión, en minúsculas y con guiones
   (`SK-16_develop_backend_ticket.md` → `sk-16-develop-backend-ticket`).
2. `category` es la ruta de su carpeta relativa a `procedures/` (`development/02_backend_development`).

Reglas para cada workflow `workflows/NN_<slug>_workflow.md`:

3. Tiene frontmatter con `name` (igual al nombre del archivo sin extensión), `description`,
   `version` y `category`.
4. Su primer título es `# Workflow NN: <nombre>`, con el mismo NN que el prefijo del archivo.
   La versión vive solo en el frontmatter: repetirla en el título es una segunda copia que deriva.
5. Cada NN se usa una sola vez: el número es la posición del workflow en el ciclo de vida, y dos
   archivos con el mismo número (como los tres `00_` de 2.31.0) no dicen cuál va primero.
"""
import os
import re
import sys

FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.S)
TOP_LEVEL_KEY = re.compile(r'^([A-Za-z0-9_-]+):\s*"?(.*?)"?\s*$')
PROCEDURE_FILE = re.compile(r"^SK-\d+_[a-z0-9_]+\.md$")
WORKFLOW_FILE = re.compile(r"^(\d{2})_[a-z0-9_]+_workflow\.md$")
WORKFLOW_FIELDS = ("name", "description", "version", "category")
PROCEDURE_CONTAINERS = ("specs", "development")


def _frontmatter(text):
    match = FRONTMATTER.match(text)
    if not match:
        return None, text
    fields = {}
    for line in match.group(1).splitlines():
        key_match = TOP_LEVEL_KEY.match(line)
        if key_match:
            fields[key_match.group(1)] = key_match.group(2)
    return fields, text[match.end():]


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _check_procedures(agents_dir, messages):
    checked = 0
    for container in PROCEDURE_CONTAINERS:
        base = os.path.join(agents_dir, "procedures", container)
        if not os.path.isdir(base):
            continue
        for folder in sorted(os.listdir(base)):
            folder_path = os.path.join(base, folder)
            if not os.path.isdir(folder_path):
                continue
            for filename in sorted(os.listdir(folder_path)):
                if not filename.startswith("SK-") or not filename.endswith(".md"):
                    continue
                checked += 1
                rel_path = f"procedures/{container}/{folder}/{filename}"
                if not PROCEDURE_FILE.match(filename):
                    messages.append(f"❌ {rel_path}: el nombre no sigue SK-NN_<slug_en_snake_case>.md")
                    continue
                fields, _ = _frontmatter(_read(os.path.join(folder_path, filename)))
                if fields is None:
                    messages.append(f"❌ {rel_path}: sin frontmatter YAML")
                    continue
                expected_name = filename[:-3].lower().replace("_", "-")
                expected_category = f"{container}/{folder}"
                if fields.get("name") != expected_name:
                    messages.append(f"❌ {rel_path}: name es '{fields.get('name', '')}', debe ser '{expected_name}'")
                if fields.get("category") != expected_category:
                    messages.append(
                        f"❌ {rel_path}: category es '{fields.get('category', '')}', debe ser '{expected_category}'"
                    )
    return checked


def _check_workflows(agents_dir, messages):
    checked = 0
    numbers = {}
    base = os.path.join(agents_dir, "workflows")
    if not os.path.isdir(base):
        return checked
    for filename in sorted(os.listdir(base)):
        if not filename.endswith(".md"):
            continue
        checked += 1
        rel_path = f"workflows/{filename}"
        file_match = WORKFLOW_FILE.match(filename)
        if not file_match:
            messages.append(f"❌ {rel_path}: el nombre no sigue NN_<slug_en_snake_case>_workflow.md")
            continue
        numbers.setdefault(file_match.group(1), []).append(filename)
        fields, body = _frontmatter(_read(os.path.join(base, filename)))
        if fields is None:
            messages.append(f"❌ {rel_path}: sin frontmatter YAML ({', '.join(WORKFLOW_FIELDS)})")
            continue
        missing = [field for field in WORKFLOW_FIELDS if not fields.get(field)]
        if missing:
            messages.append(f"❌ {rel_path}: faltan campos en el frontmatter: {', '.join(missing)}")
        if fields.get("name") and fields["name"] != filename[:-3]:
            messages.append(f"❌ {rel_path}: name es '{fields['name']}', debe ser '{filename[:-3]}'")
        title = next((line for line in body.splitlines() if line.startswith("# ")), "")
        expected_prefix = f"# Workflow {file_match.group(1)}: "
        if not title.startswith(expected_prefix):
            messages.append(f"❌ {rel_path}: el título debe empezar por '{expected_prefix.strip()}' (hay: '{title}')")
        elif re.search(r"\(v\d+\.\d+\.\d+\)\s*$", title):
            messages.append(f"❌ {rel_path}: el título repite la versión; vive solo en el frontmatter")
    for number, filenames in sorted(numbers.items()):
        if len(filenames) > 1:
            messages.append(f"❌ workflows/: el número {number} se repite en {', '.join(filenames)}")
    return checked


def run_checks(agents_dir):
    messages = []
    checked = _check_procedures(agents_dir, messages) + _check_workflows(agents_dir, messages)
    return checked, len(messages), messages


def main():
    agents_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    checked_count, violation_count, messages = run_checks(agents_dir)

    for msg in messages:
        print(msg)

    print(f"\nTotal de procedimientos y workflows auditados por convención de nombres: {checked_count}")
    print(f"Total de incumplimientos encontrados: {violation_count}")

    if violation_count > 0:
        sys.exit(1)
    else:
        print("✅ Los nombres y el frontmatter de momoy siguen la convención.")


if __name__ == "__main__":
    main()
