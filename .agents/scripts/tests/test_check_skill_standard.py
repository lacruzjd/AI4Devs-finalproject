#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_skill_standard import run_checks  # noqa: E402

VALID_COMMAND = """---
name: {name}
description: "Implementa un ticket. Solo por invocación explícita del usuario."
license: MIT
metadata:
  framework: momoy
  version: "1.0.0"
---

# /{name}

Lee y ejecuta `.agents/workflows/02_cascading_dev_workflow.md`.
"""

IMPLICIT_OFF = "policy:\n  allow_implicit_invocation: false\n"


class CheckSkillStandardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.agents_dir = os.path.join(self.tmp, ".agents")
        os.makedirs(os.path.join(self.agents_dir, "skills"))
        os.makedirs(os.path.join(self.agents_dir, "workflows"))
        with open(os.path.join(self.agents_dir, "workflows", "02_cascading_dev_workflow.md"), "w") as f:
            f.write("# workflow\n")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write(self, rel_path, content):
        path = os.path.join(self.agents_dir, "skills", rel_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _write_command(self, name, body=None, openai_yaml=IMPLICIT_OFF):
        self._write(f"{name}/SKILL.md", body if body is not None else VALID_COMMAND.format(name=name))
        if openai_yaml is not None:
            self._write(f"{name}/agents/openai.yaml", openai_yaml)

    def test_valid_command_reports_zero_violations(self):
        self._write_command("momoy-dev")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 1)
        self.assertEqual(violations, 0, msg=messages)

    def test_legacy_procedure_containers_are_allowed_without_skill_md(self):
        self._write("specs/01_product_definition/SK-01_discover_product_vision.md", "---\nname: SK-01\n---\n")
        self._write("development/02_backend_development/SK-16_develop_backend_ticket.md", "---\nname: SK-16\n---\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0, msg=messages)

    def test_unknown_directory_without_skill_md_is_detected(self):
        self._write("momoy-dev/README.md", "# sin SKILL.md\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("no contiene SKILL.md", messages[0])

    def test_name_must_match_directory(self):
        self._write_command("momoy-dev", body=VALID_COMMAND.format(name="momoy-develop"))

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("no coincide con el directorio", messages[0])

    def test_invalid_name_format_is_detected(self):
        self._write("Momoy_Dev/SKILL.md", VALID_COMMAND.format(name="Momoy_Dev"))

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertTrue(any("inválido" in m for m in messages), msg=messages)

    def test_double_hyphen_name_is_detected(self):
        self._write("pdf--tools/SKILL.md", VALID_COMMAND.format(name="pdf--tools"))

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertTrue(any("inválido" in m for m in messages), msg=messages)

    def test_non_standard_frontmatter_field_is_detected(self):
        self._write_command(
            "momoy-dev",
            body=VALID_COMMAND.format(name="momoy-dev").replace("license: MIT", "disable-model-invocation: true"),
        )

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("disable-model-invocation", messages[0])

    def test_missing_or_oversized_description_is_detected(self):
        self._write_command("momoy-dev", body=VALID_COMMAND.format(name="momoy-dev").replace(
            'description: "Implementa un ticket. Solo por invocación explícita del usuario."', 'description: ""'))
        self._write("helper/SKILL.md", f'---\nname: helper\ndescription: "{"x" * 1025}"\n---\n')

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 2, msg=messages)
        self.assertTrue(any("falta 'description'" in m for m in messages))
        self.assertTrue(any("supera el máximo" in m for m in messages))

    def test_missing_frontmatter_is_detected(self):
        self._write("helper/SKILL.md", "# sin frontmatter\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("frontmatter", messages[0])

    def test_command_without_entrypoint_reference_is_detected(self):
        self._write_command("momoy-dev", body=VALID_COMMAND.format(name="momoy-dev").replace(
            "Lee y ejecuta `.agents/workflows/02_cascading_dev_workflow.md`.", "Implementa el ticket aquí mismo."))

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("no referencia ningún", messages[0])

    def test_command_with_broken_workflow_reference_is_detected(self):
        self._write_command("momoy-dev", body=VALID_COMMAND.format(name="momoy-dev").replace(
            "02_cascading_dev_workflow.md", "99_missing_workflow.md"))

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("referencia rota", messages[0])

    def test_command_without_openai_yaml_or_with_implicit_invocation_is_detected(self):
        self._write_command("momoy-dev", openai_yaml=None)
        self._write_command("momoy-spec", body=VALID_COMMAND.format(name="momoy-spec"),
                            openai_yaml="policy:\n  allow_implicit_invocation: true\n")

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 2, msg=messages)
        self.assertTrue(any("falta agents/openai.yaml" in m for m in messages))
        self.assertTrue(any("debe declarar" in m for m in messages))

    def test_non_momoy_skill_skips_command_rules(self):
        self._write("pdf-tools/SKILL.md", '---\nname: pdf-tools\ndescription: "Procesa PDFs."\n---\n\nSin workflow.\n')

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 1)
        self.assertEqual(violations, 0, msg=messages)

    def test_oversized_skill_is_detected(self):
        self._write("helper/SKILL.md", '---\nname: helper\ndescription: "x"\n---\n' + "linea\n" * 500)

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1, msg=messages)
        self.assertIn("líneas supera", messages[0])

    def test_missing_skills_dir_reports_zero(self):
        checked, violations, messages = run_checks(os.path.join(self.tmp, "does_not_exist"))

        self.assertEqual(checked, 0)
        self.assertEqual(violations, 0)
        self.assertEqual(messages, [])


if __name__ == "__main__":
    unittest.main()
