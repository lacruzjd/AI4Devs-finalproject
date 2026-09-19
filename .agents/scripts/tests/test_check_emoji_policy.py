#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_emoji_policy import run_checks  # noqa: E402


class CheckEmojiPolicyTests(unittest.TestCase):
    def setUp(self):
        self.agents_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.agents_dir, ignore_errors=True)

    def _write(self, rel_path, content):
        path = os.path.join(self.agents_dir, rel_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def test_clean_file_reports_zero_violations(self):
        self._write("skills/SK-01.md", "# SK-01: Título\n\nFlujo `Idea → docs/` sin pictogramas.\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 1)
        self.assertEqual(violations, 0, msg=messages)

    def test_decorative_emoji_in_heading_is_detected(self):
        self._write("skills/SK-01.md", "## 🧪 FASE 2: Pruebas\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("Emoji en título", messages[0])
        self.assertIn("L1", messages[0])

    def test_allowed_marker_in_heading_is_still_detected(self):
        self._write("skills/SK-01.md", "## ✅ FASE 3: Confirmación\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("Emoji en título", messages[0])

    def test_allowed_markers_in_body_are_accepted(self):
        self._write(
            "rules/00.md",
            "* **Estado:** [🟢 ÉXITO | 🟡 REVISIÓN | 🔴 RECHAZADO]\n"
            "1. **🟠 ALTA** / **🔵 BAJA**\n"
            "| Gate | ✅ PASÓ / ❌ FALLÓ | ⚠️ NO VERIFICABLE |\n",
        )

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 0, msg=messages)

    def test_decorative_emoji_in_body_is_detected(self):
        self._write("workflows/06.md", "6. 🛑 **PAUSA OBLIGATORIA:** esperar al humano.\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("fuera de la lista permitida", messages[0])
        self.assertIn("U+1F6D1", messages[0])

    def test_pictographic_arrow_is_detected_but_typographic_arrow_is_not(self):
        self._write("skills/nav.md", "[⬅️ Volver](a.md) | [Siguiente ➡️](b.md)\n[← Volver](a.md) → ok\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("L1", messages[0])

    def test_emoji_in_shell_script_output_is_detected(self):
        self._write("scripts/check.sh", 'echo "🎉 Todo verificado"\necho "✅ Todo verificado"\n')

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn(os.path.join("scripts", "check.sh"), messages[0])

    def test_shell_comment_is_not_treated_as_markdown_heading(self):
        self._write("scripts/check.sh", "# ✅ comentario con marcador permitido\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 0, msg=messages)

    def test_changelog_is_exempt(self):
        self._write("CHANGELOG.md", "# 📜 Changelog\n- Se quitó el 🚀 del título.\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_tests_and_pycache_directories_are_not_scanned(self):
        self._write("scripts/tests/fixture.md", "# 🧪 fixture\n")
        self._write("scripts/__pycache__/cache.py", "# 🚀\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_unchecked_extensions_are_skipped(self):
        self._write("examples/data.json", '{"icon": "🚀"}\n')

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_zwj_sequence_counts_as_one_violation_per_line(self):
        self._write("skills/SK-01.md", "Texto con 🧗‍♂️ y 🚀 en la misma línea.\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)

    def test_missing_agents_dir_reports_zero(self):
        checked, violations, messages = run_checks(os.path.join(self.agents_dir, "does_not_exist"))

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0)
        self.assertEqual(messages, [])


if __name__ == "__main__":
    unittest.main()
