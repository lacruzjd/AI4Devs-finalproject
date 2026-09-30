#!/usr/bin/env python3
"""Migra el docs/ de un proyecto a las rutas de momoy 3.0.0.

momoy 3.0.0 pasó a inglés y snake_case los cinco artefactos de docs/ que tenían el nombre en
español o en mayúsculas. Un proyecto que actualiza `.agents/` conserva sus archivos con el nombre
anterior, y los gates leen el nuevo: sin migrar, `check_spec_artifacts.py` informa cada ruta
anterior en el gate `migracion` en vez de saltarse en silencio las invariantes o la matriz.

Por defecto solo muestra el plan. Con `--apply`:

1. Renombra cada ruta anterior que exista a la nueva. Si la nueva también existe, es un conflicto:
   no se toca ninguna de las dos y el humano decide cuál vale.
2. Reescribe las referencias a los nombres anteriores en `docs/**/*.md`, `docs/**/*.yaml` y
   `AGENTS.md`. Las carpetas no cambian, así que los enlaces relativos siguen resolviendo.

No usa git: revisa el resultado con `git status` y `git diff` antes de commitear.
"""
import argparse
import os
import sys

# (ruta anterior, ruta nueva), relativas a la raíz del proyecto
LEGACY_DOCS = (
    ("docs/01_product_definition/01_glosario_y_reglas_negocio.md", "docs/01_product_definition/01_glossary_and_business_rules.md"),
    ("docs/05_agile_planning/11_user_stories/indice_user_stories.md", "docs/05_agile_planning/11_user_stories/user_stories_index.md"),
    ("docs/05_agile_planning/12_tickets/indice_tickets.md", "docs/05_agile_planning/12_tickets/tickets_index.md"),
    ("docs/05_agile_planning/13_matriz_trazabilidad.md", "docs/05_agile_planning/13_traceability_matrix.md"),
    ("docs/audits/AUDIT-CONTRACT-DISCREPANCIES.md", "docs/audits/contract_discrepancies.md"),
)
EXTRA_TOKENS = (("document: matriz_trazabilidad", "document: traceability_matrix"),)
REWRITE_EXT = (".md", ".yaml")


def _stem(path):
    return os.path.splitext(os.path.basename(path))[0]


def _files_to_rewrite(root):
    agents = os.path.join(root, "AGENTS.md")
    if os.path.isfile(agents):
        yield "AGENTS.md"
    for dirpath, _, filenames in os.walk(os.path.join(root, "docs")):
        for filename in sorted(filenames):
            if filename.endswith(REWRITE_EXT):
                yield os.path.relpath(os.path.join(dirpath, filename), root)


def run(root, apply=False):
    """Devuelve (renombres, archivos con referencias reescritas, conflictos), hechos o planeados."""
    renames, conflicts = [], []
    for old, new in LEGACY_DOCS:
        if not os.path.isfile(os.path.join(root, old)):
            continue
        (conflicts if os.path.exists(os.path.join(root, new)) else renames).append((old, new))

    tokens = [(_stem(old), _stem(new)) for old, new in LEGACY_DOCS if (old, new) not in conflicts]
    tokens += list(EXTRA_TOKENS)

    if apply:
        for old, new in renames:
            os.rename(os.path.join(root, old), os.path.join(root, new))

    rewritten = []
    for rel in _files_to_rewrite(root):
        path = os.path.join(root, rel)
        with open(path, encoding="utf-8") as f:
            text = original = f.read()
        for old, new in tokens:
            text = text.replace(old, new)
        if text != original:
            rewritten.append(rel)
            if apply:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(text)
    return renames, rewritten, conflicts


def main():
    parser = argparse.ArgumentParser(description="Migra docs/ a las rutas de momoy 3.0.0.")
    parser.add_argument("--apply", action="store_true", help="aplica el plan (por defecto solo lo muestra)")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    renames, rewritten, conflicts = run(root, apply=args.apply)
    verb = "Renombrado" if args.apply else "Se renombraría"

    for old, new in renames:
        print(f"{verb}: {old} → {new}")
    for rel in rewritten:
        print(f"{'Referencias reescritas' if args.apply else 'Se reescribirían referencias'} en: {rel}")
    for old, new in conflicts:
        print(f"❌ Conflicto: existen {old} y {new}; decide cuál vale y borra el otro antes de migrar.")

    if not (renames or rewritten or conflicts):
        print("✅ docs/ ya usa las rutas de momoy 3.0.0.")
    elif not args.apply and not conflicts:
        print("\nEjecuta de nuevo con --apply para migrar, y revisa el resultado con git diff.")
    if conflicts:
        sys.exit(1)


if __name__ == "__main__":
    main()
