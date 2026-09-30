#!/usr/bin/env python3
"""Archivos del repositorio fuente de momoy que viven fuera de `.agents/`.

`.agents/` es lo que `install.sh` copia a cada proyecto. El historial, la guía de contribución,
la política de versionado, los ADR y el mapa de sistema sirven para mantener momoy, no para
usarlo, y viven en la raíz del repositorio fuente. Los guardas de `validate_agents.sh` los revisan
solo cuando corren ahí; en un proyecto instalado esos archivos no existen y no se buscan.
"""
import os

# Solo el repositorio fuente tiene el mapa de sistema de momoy: un proyecto instalado nunca lo recibe.
SOURCE_MARKER = os.path.join("docs", "system_map", "momoy_system_map.html")
SOURCE_ENTRIES = ("README.md", "CHANGELOG.md", "CONTRIBUTING.md", "VERSIONING.md", "docs")


def source_root(agents_dir):
    """Raíz del repositorio fuente si `agents_dir` vive en él; None en un proyecto instalado."""
    root = os.path.dirname(os.path.abspath(agents_dir))
    return root if os.path.isfile(os.path.join(root, SOURCE_MARKER)) else None


def source_files(agents_dir, extensions):
    """Rutas absolutas de los archivos del repositorio fuente fuera de `.agents/`, en orden estable."""
    root = source_root(agents_dir)
    if root is None:
        return []
    found = []
    for entry in SOURCE_ENTRIES:
        path = os.path.join(root, entry)
        if os.path.isfile(path) and os.path.splitext(path)[1] in extensions:
            found.append(path)
        elif os.path.isdir(path):
            for dirpath, dirnames, filenames in os.walk(path):
                dirnames.sort()
                found.extend(os.path.join(dirpath, f) for f in sorted(filenames)
                             if os.path.splitext(f)[1] in extensions)
    return found
