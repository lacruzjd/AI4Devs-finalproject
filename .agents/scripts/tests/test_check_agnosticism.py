#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_agnosticism import run_checks, run_doc_checks  # noqa: E402


class CheckAgnosticismTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.scripts_dir = os.path.join(self.tmp, "scripts")
        os.makedirs(self.scripts_dir)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write_script(self, filename, content):
        path = os.path.join(self.scripts_dir, filename)
        with open(path, "w") as f:
            f.write(content)
        return path

    def test_agnostic_script_reports_zero_violations(self):
        self._write_script(
            "check_rules_freshness.sh",
            "#!/usr/bin/env bash\ngit log -1 --format=%ct -- \"docs/02_architecture_design/03_domain_model.md\"\n",
        )

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 1)
        self.assertEqual(violations, 0, msg=messages)

    def test_stack_specific_binary_is_detected(self):
        self._write_script(
            "check_something.sh",
            "#!/usr/bin/env bash\nnpx eslint . --max-warnings 0\n",
        )

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(violations, 1)
        self.assertIn("npx", messages[0])

    def test_hardcoded_monorepo_layout_is_detected(self):
        self._write_script(
            "check_something.sh",
            "#!/usr/bin/env bash\nfind apps/backend/src -name '*.ts'\n",
        )

        checked, violations, messages = run_checks(self.scripts_dir)

        # apps/backend AND *.ts both match on the same line
        self.assertEqual(violations, 2, msg=messages)

    def test_markdown_files_are_not_pattern_scanned(self):
        self._write_script("README.md", "run `npx eslint` in a code fence, purely documentation\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_py_file_with_blocked_pattern_is_detected(self):
        self._write_script(
            "check_something.py",
            "import subprocess\nsubprocess.run(['npx ', 'eslint', '.'])\n",
        )

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(violations, 1)
        self.assertIn("npx", messages[0])

    def test_unexpected_extension_is_flagged(self):
        self._write_script("check_something.js", "// clean content, but the wrong language entirely\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(violations, 1)
        self.assertIn("Extensión no permitida", messages[0])

    def test_dotfiles_are_not_flagged_as_unexpected_extension(self):
        self._write_script(".gitignore", "__pycache__/\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_own_module_is_exempt_from_pattern_scan(self):
        # check_agnosticism.py define BLOCKED_SUBSTRINGS como literales — escanearse a sí
        # mismo con sus propios patrones produciría falsos positivos garantizados.
        self._write_script("check_agnosticism.py", 'BLOCKED_SUBSTRINGS = [("npx ", "x"), ("apps/backend", "y")]\n')

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_nested_subdirectory_sh_file_is_detected(self):
        nested_dir = os.path.join(self.scripts_dir, "helpers")
        os.makedirs(nested_dir)
        with open(os.path.join(nested_dir, "check_nested.sh"), "w") as f:
            f.write("#!/usr/bin/env bash\nnpx eslint .\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(violations, 1)
        self.assertIn(os.path.join("helpers", "check_nested.sh"), messages[0])

    def test_tests_subdirectory_is_not_scanned(self):
        tests_dir = os.path.join(self.scripts_dir, "tests")
        os.makedirs(tests_dir)
        with open(os.path.join(tests_dir, "fixture.sh"), "w") as f:
            f.write("npx should-not-be-scanned\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_nested_tests_subdirectory_is_not_scanned(self):
        nested_tests_dir = os.path.join(self.scripts_dir, "helpers", "tests")
        os.makedirs(nested_tests_dir)
        with open(os.path.join(nested_tests_dir, "fixture.sh"), "w") as f:
            f.write("npx should-not-be-scanned-either\n")

        checked, violations, messages = run_checks(self.scripts_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_missing_scripts_dir_reports_zero(self):
        checked, violations, messages = run_checks(os.path.join(self.tmp, "does_not_exist"))

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0)
        self.assertEqual(messages, [])



class CheckProjectAgnosticismInDocsTests(unittest.TestCase):
    """El markdown de .agents/ (skills, workflows, rules) tampoco puede acoplarse a un proyecto."""

    def setUp(self):
        self.agents_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.agents_dir, ignore_errors=True)

    def _write(self, rel, content):
        path = os.path.join(self.agents_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _labels(self, findings):
        return [label for _, _, label, _ in findings]

    def test_generic_skill_reports_zero_findings(self):
        self._write("skills/SK-01.md", "# SK-01\nLee `docs/00_stack_manifest.md` (Fase 0) y crea `TK-XXX` o `TK-NNN`.\n")

        checked, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(checked, 1)
        self.assertEqual(findings, [])

    def test_project_ticket_story_and_requirement_ids_are_detected(self):
        self._write("workflows/02.md", "Precedente: TK-055, US-012 y REQ-058 lo resolvieron así.\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual([match for _, _, _, match in findings], ["TK-055", "US-012", "REQ-058"])

    def test_momoy_core_ticket_convention_is_allowed(self):
        self._write("workflows/01.md", "Garantiza que existan `shared/backend/TK-001.md` y `shared/frontend/TK-001-FE.md`.\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(findings, [])

    def test_project_audit_ids_are_detected(self):
        self._write("skills/SK-12.md", "Carve-out C-DEV-006-4, descubierto en AUDIT-DEV-006.\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(sorted(match for _, _, _, match in findings), ["AUDIT-DEV-006", "C-DEV-006-4"])

    def test_guard_numbers_are_detected_but_own_non_goals_are_not(self):
        self._write("skills/SK-40.md", "Fase 0 (Guard 24). Si el criterio cambia, ver Non-Goal 3.\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual([match for _, _, _, match in findings], ["Guard 24"])
        self.assertIn("cita la guardia por su nombre", findings[0][2])

    def test_monorepo_layout_in_docs_is_detected(self):
        self._write("skills/SK-12.md", "   - `apps/backend/src/modules/{modulo}/domain/...`\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0][1], 1)

    def test_changelog_and_tests_are_exempt(self):
        self._write("CHANGELOG.md", "TK-055 y Guard 24 son historia.\n")
        self._write("scripts/tests/test_x.py", "TICKET = 'TK-003'\n")

        checked, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(findings, [])

    def test_script_comments_are_scanned_too(self):
        self._write("scripts/check_something.sh", "#!/usr/bin/env bash\n# TK-038: nació en otro proyecto\n")

        _, findings = run_doc_checks(self.agents_dir)

        self.assertEqual([(rel, line) for rel, line, _, _ in findings], [(os.path.join("scripts", "check_something.sh"), 2)])

    def test_own_module_is_exempt_from_doc_scan(self):
        self._write("scripts/check_agnosticism.py", 'EXAMPLE = "TK-055 Guard 24 apps/backend"\n')

        checked, findings = run_doc_checks(self.agents_dir)

        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
