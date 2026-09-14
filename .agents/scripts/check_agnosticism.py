#!/usr/bin/env python3
"""TK-038/TK-065: guarda que .agents/scripts/ nunca vuelva a acoplarse al stack de un proyecto.

install.sh copia .agents/ verbatim (cp -R) a cualquier proyecto nuevo, sin importar su
stack. Un script bajo .agents/scripts/ que asuma un lenguaje, gestor de paquetes, test
runner o layout de directorios específico rompe la portabilidad para el siguiente
proyecto que instale el framework (ver CONTRIBUTING.md). Cualquier lógica de gobernanza
que sí dependa del stack real debe generarse por skill (ej. SK-27) hacia el árbol del
proyecto consumidor (docs/04_governance_and_quality/scripts/), nunca vivir aquí.

TK-065: hasta ahora este guard solo escaneaba archivos *.sh en el nivel superior de
.agents/scripts/ (documentado como blind spot conocido en CHANGELOG.md, TK-053/TK-055,
pero nunca cerrado). Un .py acoplado al stack, o un .sh anidado en una subcarpeta que no
fuera tests/, lo evadía en silencio. Ahora el recorrido es recursivo (excluyendo tests/
y __pycache__ a cualquier profundidad) y cubre dos capas: (1) BLOCKED_SUBSTRINGS aplica
también a .py, no solo a .sh; (2) cualquier archivo con una extensión fuera de la
allowlist .sh/.py/.md es en sí mismo una violación — la vía más simple de acoplarse a un
stack es escribir el script en otro lenguaje por completo, y ningún substring bloqueado
lo habría detectado.

Segunda pasada (documentación): el markdown de skills, workflows y rules es el 90% de momoy y
tampoco puede acoplarse a un proyecto concreto. Hasta ahora nada lo verificaba, y en un
proyecto real se acumularon identificadores de su historial (tickets, auditorías) que en otro
proyecto no significan nada o colisionan con los suyos, y números de guardia que solo existen
en un AGENTS.md concreto (SK-27 advierte que esa numeración es propia de cada proyecto). La
pasada es informativa por defecto; --strict-docs la vuelve bloqueante y es el modo que usa
validate_agents.sh desde que la deuda heredada llegó a 0.
"""
import argparse
import os
import re
import sys

BLOCKED_SUBSTRINGS = [
    ("npx ", "invoca npx (Node) directamente"),
    ("pnpm ", "invoca pnpm (Node) directamente"),
    ("npm ", "invoca npm (Node) directamente"),
    ("yarn ", "invoca yarn (Node) directamente"),
    ("pip install", "invoca pip (Python) directamente"),
    ("pip3 ", "invoca pip3 (Python) directamente"),
    ("cargo ", "invoca cargo (Rust) directamente"),
    ("mvn ", "invoca mvn (Java/Maven) directamente"),
    ("gradle ", "invoca gradle (Java/Kotlin) directamente"),
    ("go test", "invoca go test (Go) directamente"),
    ("go run", "invoca go run (Go) directamente"),
    ("bundle exec", "invoca bundler (Ruby) directamente"),
    ("*.ts", "asume extensión de archivo TypeScript"),
    ("*.tsx", "asume extensión de archivo TSX"),
    ("*.jsx", "asume extensión de archivo JSX"),
    (".controller.", "asume convención de nombres de un proyecto (controller)"),
    (".service.", "asume convención de nombres de un proyecto (service)"),
    (".dto.", "asume convención de nombres de un proyecto (dto)"),
    (".schema.", "asume convención de nombres de un proyecto (schema)"),
    ("apps/backend", "asume el layout de monorepo de un proyecto específico"),
    ("apps/frontend", "asume el layout de monorepo de un proyecto específico"),
]

EXCLUDED_DIR_NAMES = {"tests", "__pycache__"}
ALLOWED_EXTENSIONS = {".sh", ".py", ".md"}
PATTERN_CHECKED_EXTENSIONS = {".sh", ".py"}
# Este propio archivo define BLOCKED_SUBSTRINGS como literales de string — escanearlo
# contra sí mismo produce falsos positivos garantizados (la lista de patrones prohibidos
# contiene, por definición, cada patrón prohibido). Único archivo exento del chequeo de
# patrones; sigue sujeto al chequeo de extensión como cualquier otro.
SELF_FILENAME = os.path.basename(__file__)


DOC_PATTERNS = [
    (re.compile(r"\b(?:TK|US|REQ)-\d{3}(?:-[A-Z0-9]+)?\b"),
     "identificador de ticket, historia o requisito de un proyecto concreto: describe la lección, no su ID"),
    (re.compile(r"\bAUDIT-[A-Z]+-\d{3}\b|\bC-DEV-\d{3}-\d+\b"),
     "identificador de auditoría de un proyecto concreto: describe la lección, no su ID"),
    (re.compile(r"\bGuard \d+\b"),
     "número de guardia: depende del AGENTS.md de cada proyecto; cita la guardia por su nombre"),
    (re.compile(r"apps/(?:backend|frontend)"),
     "layout de monorepo de un proyecto concreto"),
]
# Convención de momoy (SK-12): todo proyecto tiene tickets habilitadores de core con estos IDs.
DOC_ALLOWED_MATCHES = {"TK-001", "TK-001-FE"}
DOC_EXEMPT_FILENAMES = {"CHANGELOG.md"}
DOC_EXTENSIONS = {".md", ".sh", ".py"}


def run_doc_checks(agents_dir):
    """Recorre .agents/ (excluyendo tests/, __pycache__, el CHANGELOG y este módulo) buscando
    acoplamiento a un proyecto concreto en documentación y comentarios.

    Devuelve (checked_count, findings) con findings = [(ruta_relativa, línea, motivo, coincidencia)].
    """
    checked_count = 0
    findings = []
    if not os.path.isdir(agents_dir):
        return checked_count, findings
    for root, dirs, files in os.walk(agents_dir):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIR_NAMES)
        for fname in sorted(files):
            _, ext = os.path.splitext(fname)
            if ext not in DOC_EXTENSIONS or fname in DOC_EXEMPT_FILENAMES or fname == SELF_FILENAME:
                continue
            file_path = os.path.join(root, fname)
            rel_path = os.path.relpath(file_path, agents_dir)
            checked_count += 1
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                for line_idx, line in enumerate(f, 1):
                    for pattern, reason in DOC_PATTERNS:
                        for match in (m.group(0) for m in pattern.finditer(line)):
                            if match not in DOC_ALLOWED_MATCHES:
                                findings.append((rel_path, line_idx, reason, match))
    return checked_count, findings


def run_checks(scripts_dir):
    """Escanea .agents/scripts/ (recursivo, excluyendo tests/ y __pycache__) en busca de
    acoplamiento a stack: BLOCKED_SUBSTRINGS en *.sh/*.py, y cualquier extensión fuera de
    la allowlist .sh/.py/.md como violación estructural.

    Devuelve (checked_count, violation_count, messages) sin imprimir ni salir del
    proceso, para poder invocarse tanto desde CLI como desde tests.
    """
    checked_count = 0
    violation_count = 0
    messages = []

    if not os.path.isdir(scripts_dir):
        return checked_count, violation_count, messages

    for root, dirs, files in os.walk(scripts_dir):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIR_NAMES)

        for fname in sorted(files):
            file_path = os.path.join(root, fname)
            if not os.path.isfile(file_path):
                continue

            rel_path = os.path.relpath(file_path, scripts_dir)
            _, ext = os.path.splitext(fname)

            if ext not in ALLOWED_EXTENSIONS:
                if fname.startswith("."):
                    # Dotfiles de configuración (.gitignore, etc.) no son código de gobernanza.
                    continue
                checked_count += 1
                violation_count += 1
                messages.append(
                    f"❌ Extensión no permitida en {rel_path}: '{ext or fname}' — .agents/scripts/ solo "
                    f"admite .sh/.py/.md; una extensión distinta suele ser un script acoplado a otro "
                    f"lenguaje/stack. Mueve esta lógica a un script generado por skill (ej. SK-27) en el "
                    f"árbol del proyecto consumidor."
                )
                continue

            if ext not in PATTERN_CHECKED_EXTENSIONS or fname == SELF_FILENAME:
                continue

            checked_count += 1

            with open(file_path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            for line_idx, line in enumerate(lines, 1):
                for pattern, reason in BLOCKED_SUBSTRINGS:
                    if pattern in line:
                        messages.append(
                            f"❌ Acoplamiento a stack en {rel_path} L{line_idx}: '{pattern.strip()}' — {reason}. "
                            f"Mueve esta lógica a un script generado por skill (ej. SK-27) en el árbol del proyecto consumidor."
                        )
                        violation_count += 1

    return checked_count, violation_count, messages


def main():
    parser = argparse.ArgumentParser(description="Guardas de agnosticismo de momoy.")
    parser.add_argument("--strict-docs", action="store_true", help="falla si la documentación está acoplada a un proyecto")
    parser.add_argument("--verbose", action="store_true", help="lista cada acoplamiento de la documentación")
    args = parser.parse_args()
    scripts_dir = os.path.dirname(os.path.abspath(__file__))

    checked_count, violation_count, messages = run_checks(scripts_dir)

    for msg in messages:
        print(msg)

    print(f"\nTotal de archivos .sh/.py auditados en .agents/scripts/ (recursivo): {checked_count}")
    print(f"Total de acoplamientos a stack encontrados: {violation_count}")

    doc_checked, doc_findings = run_doc_checks(os.path.dirname(scripts_dir))
    marker = "❌" if args.strict_docs else "⚠️"
    if args.verbose or args.strict_docs:
        for rel_path, line_idx, reason, match in doc_findings:
            print(f"{marker} {rel_path} L{line_idx}: '{match}' — {reason}")
    by_reason = {}
    for _, _, reason, _ in doc_findings:
        by_reason[reason] = by_reason.get(reason, 0) + 1
    print(f"\nTotal de archivos de .agents/ auditados por acoplamiento a proyecto: {doc_checked}")
    print(f"Total de acoplamientos a proyecto en documentación: {len(doc_findings)}"
          + ("" if args.strict_docs else " (informativo; --verbose para listarlos)"))
    for reason, count in sorted(by_reason.items(), key=lambda kv: -kv[1]):
        print(f"  {count:4d}  {reason.split(':')[0]}")

    if violation_count > 0 or (args.strict_docs and doc_findings):
        sys.exit(1)
    print("✅ .agents/scripts/ sigue siendo 100% agnóstico de stack.")


if __name__ == "__main__":
    main()
