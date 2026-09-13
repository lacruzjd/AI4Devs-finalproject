#!/usr/bin/env python3
"""Guarda de estilo de momoy: sin emojis decorativos en .agents/.

momoy retiró 647 emojis (410 de ellos en títulos) porque no aportaban información, añadían
ruido visual y rompían búsquedas literales sobre títulos (ver CHANGELOG.md, 2.17.0). Sin
un mecanismo ejecutable, la próxima skill los reintroduciría — así que la regla de
CONTRIBUTING.md se verifica aquí, con dos reglas:

1. En archivos .md, ninguna línea de título (`#` a `######`) lleva emoji, ni siquiera un
   marcador permitido: un título con pictograma es adorno por definición. La detección es
   por línea y no distingue bloques de código — un comentario `# ...` dentro de un bloque
   también cuenta como título, y tampoco debe llevar emoji.
2. En cualquier otra línea de .md/.sh/.py solo se admiten los marcadores semánticos de
   ALLOWED_MARKERS (escala de estado/severidad, verificación, cruz, aviso).

CHANGELOG.md queda exento: es historial inmutable y sus entradas antiguas citan los
emojis que existían. tests/ y __pycache__ se excluyen a cualquier profundidad (los tests
necesitan emojis como fixtures).
"""
import os
import re
import sys

# Escritos como escapes para que este archivo no dependa de sí mismo para pasar el chequeo.
ALLOWED_MARKERS = {
    "\U0001F7E2",  # círculo verde — éxito / completado
    "\U0001F7E1",  # círculo amarillo — requiere revisión / severidad media
    "\U0001F7E0",  # círculo naranja — severidad alta
    "\U0001F534",  # círculo rojo — rechazado / severidad crítica
    "\U0001F535",  # círculo azul — severidad baja
    "✅",      # marca de verificación — pasó
    "❌",      # cruz — falló
    "⚠",      # aviso — no verificable / advertencia
}

# Selector de variación y unión de ancho cero: modifican al emoji previo, no son emojis.
MODIFIERS = {"️", "‍"}

_EXTRA_CODEPOINTS = (
    {0x2139, 0x2328, 0x23CF, 0x231A, 0x231B, 0x2B05, 0x2B06, 0x2B07, 0x2B1B, 0x2B1C, 0x2B50, 0x2B55,
     0x3030, 0x303D, 0x3297, 0x3299}
    | set(range(0x23E9, 0x23F4))
    | set(range(0x23F8, 0x23FB))
)

CHECKED_EXTENSIONS = {".md", ".sh", ".py"}
EXCLUDED_DIR_NAMES = {"tests", "__pycache__"}
EXEMPT_FILENAMES = {"CHANGELOG.md"}
HEADING = re.compile(r"^\s{0,3}#{1,6}\s")


def is_emoji(ch):
    """Pictogramas (U+1F000–1FAFF), símbolos varios y dingbats (U+2600–27BF) y los emojis
    sueltos de otros bloques. Las flechas tipográficas (→ ←, U+2190–21FF) no cuentan."""
    code = ord(ch)
    return 0x1F000 <= code <= 0x1FAFF or 0x2600 <= code <= 0x27BF or code in _EXTRA_CODEPOINTS


def _describe(chars):
    return " ".join(f"U+{ord(c):04X}" for c in chars)


def run_checks(agents_dir):
    """Recorre .agents/ y aplica las dos reglas del módulo.

    Devuelve (checked_count, violation_count, messages) sin imprimir ni salir del
    proceso, para poder invocarse tanto desde CLI como desde tests.
    """
    checked_count = 0
    violation_count = 0
    messages = []

    if not os.path.isdir(agents_dir):
        return checked_count, violation_count, messages

    for root, dirs, files in os.walk(agents_dir):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIR_NAMES)

        for fname in sorted(files):
            _, ext = os.path.splitext(fname)
            if ext not in CHECKED_EXTENSIONS or fname in EXEMPT_FILENAMES:
                continue

            file_path = os.path.join(root, fname)
            rel_path = os.path.relpath(file_path, agents_dir)
            checked_count += 1

            with open(file_path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            for line_idx, line in enumerate(lines, 1):
                emojis = [c for c in line if is_emoji(c) and c not in MODIFIERS]
                if not emojis:
                    continue

                if ext == ".md" and HEADING.match(line):
                    violation_count += 1
                    messages.append(
                        f"❌ Emoji en título en {rel_path} L{line_idx}: {_describe(emojis)} — los títulos "
                        f"no llevan emoji, ni siquiera marcadores de estado (CONTRIBUTING.md)."
                    )
                    continue

                disallowed = [c for c in emojis if c not in ALLOWED_MARKERS]
                if disallowed:
                    violation_count += 1
                    messages.append(
                        f"❌ Emoji fuera de la lista permitida en {rel_path} L{line_idx}: {_describe(disallowed)} — "
                        f"solo se admiten los marcadores semánticos de estado/severidad (CONTRIBUTING.md)."
                    )

    return checked_count, violation_count, messages


def main():
    agents_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    checked_count, violation_count, messages = run_checks(agents_dir)

    for msg in messages:
        print(msg)

    print(f"\nTotal de archivos .md/.sh/.py auditados por política de emojis: {checked_count}")
    print(f"Total de emojis fuera de política encontrados: {violation_count}")

    if violation_count > 0:
        sys.exit(1)
    else:
        print("✅ .agents/ no contiene emojis decorativos.")


if __name__ == "__main__":
    main()
