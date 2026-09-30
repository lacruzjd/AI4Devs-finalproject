#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from migrate_docs_v3 import run  # noqa: E402

OLD_MATRIX = "docs/05_agile_planning/13_matriz_trazabilidad.md"
NEW_MATRIX = "docs/05_agile_planning/13_traceability_matrix.md"
OLD_GLOSSARY = "docs/01_product_definition/01_glosario_y_reglas_negocio.md"
NEW_GLOSSARY = "docs/01_product_definition/01_glossary_and_business_rules.md"
STORY = "docs/05_agile_planning/11_user_stories/stock/US-001.md"


class MigrateDocsV3Tests(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self._write(OLD_MATRIX, "---\ndocument: matriz_trazabilidad\n---\n\n| US | TK |\n")
        self._write(OLD_GLOSSARY, "# Glosario\n")
        self._write(STORY, "Ver [glosario](../../../01_product_definition/01_glosario_y_reglas_negocio.md) "
                           "y [matriz](../../13_matriz_trazabilidad.md).\n")
        self._write("AGENTS.md", "- Matriz: `docs/05_agile_planning/13_matriz_trazabilidad.md`\n")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def _write(self, rel, content):
        path = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _read(self, rel):
        with open(os.path.join(self.root, rel), encoding="utf-8") as f:
            return f.read()

    def _exists(self, rel):
        return os.path.exists(os.path.join(self.root, rel))

    def test_dry_run_plans_without_touching_the_project(self):
        renames, rewritten, conflicts = run(self.root, apply=False)

        self.assertIn((OLD_MATRIX, NEW_MATRIX), renames)
        self.assertIn((OLD_GLOSSARY, NEW_GLOSSARY), renames)
        self.assertIn(STORY, rewritten)
        self.assertEqual(conflicts, [])
        self.assertTrue(self._exists(OLD_MATRIX))
        self.assertIn("13_matriz_trazabilidad", self._read(STORY))

    def test_apply_renames_files_and_rewrites_references(self):
        run(self.root, apply=True)

        self.assertFalse(self._exists(OLD_MATRIX))
        self.assertTrue(self._exists(NEW_MATRIX))
        self.assertTrue(self._exists(NEW_GLOSSARY))
        story = self._read(STORY)
        self.assertIn("01_glossary_and_business_rules.md", story)
        self.assertIn("../../13_traceability_matrix.md", story)
        self.assertIn(NEW_MATRIX, self._read("AGENTS.md"))
        self.assertIn("document: traceability_matrix", self._read(NEW_MATRIX))

    def test_existing_new_path_is_a_conflict_and_nothing_is_overwritten(self):
        self._write(NEW_MATRIX, "matriz nueva\n")

        renames, _, conflicts = run(self.root, apply=True)

        self.assertIn((OLD_MATRIX, NEW_MATRIX), conflicts)
        self.assertNotIn((OLD_MATRIX, NEW_MATRIX), renames)
        self.assertEqual(self._read(NEW_MATRIX), "matriz nueva\n")
        self.assertTrue(self._exists(OLD_MATRIX))

    def test_second_run_finds_nothing_to_do(self):
        run(self.root, apply=True)

        renames, rewritten, conflicts = run(self.root, apply=True)

        self.assertEqual((renames, rewritten, conflicts), ([], [], []))


if __name__ == "__main__":
    unittest.main()
