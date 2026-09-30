#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from check_naming import run_checks  # noqa: E402

PROCEDURE = "skills/development/02_backend_development/SK-16_develop_backend_ticket.md"
WORKFLOW = "workflows/10_release_workflow.md"
VALID_WORKFLOW = (
    '---\nname: 10_release_workflow\ndescription: "Release."\nversion: "1.2.0"\n'
    'category: "workflows/deployment"\n---\n\n# Workflow 10: Release\n'
)


class CheckNamingTests(unittest.TestCase):
    def setUp(self):
        self.agents_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.agents_dir, ignore_errors=True)

    def _write(self, rel_path, content):
        path = os.path.join(self.agents_dir, rel_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _procedure(self, name, category):
        return f'---\nname: {name}\ndescription: "x"\nversion: "1.0.0"\ncategory: "{category}"\n---\n\n# SK-16\n'

    def test_conforming_files_report_zero_violations(self):
        self._write(PROCEDURE, self._procedure("sk-16-develop-backend-ticket", "development/02_backend_development"))
        self._write(WORKFLOW, VALID_WORKFLOW)

        checked, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(checked, 2)
        self.assertEqual(violations, 0, msg=messages)

    def test_procedure_name_not_derived_from_filename_is_detected(self):
        self._write(PROCEDURE, self._procedure("SK-16_develop_backend_ticket", "development/02_backend_development"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("sk-16-develop-backend-ticket", messages[0])

    def test_procedure_category_pointing_elsewhere_is_detected(self):
        self._write(PROCEDURE, self._procedure("sk-16-develop-backend-ticket", "quality/01_testing"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("development/02_backend_development", messages[0])

    def test_procedure_filename_outside_snake_case_is_detected(self):
        self._write("skills/specs/01_product_definition/SK-02_Generate-PRD.md", self._procedure("x", "y"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("SK-NN_", messages[0])

    def test_workflow_without_frontmatter_is_detected(self):
        self._write(WORKFLOW, "# Workflow 10: Release\n")

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("sin frontmatter", messages[0])

    def test_workflow_title_with_other_number_is_detected(self):
        self._write(WORKFLOW, VALID_WORKFLOW.replace("# Workflow 10:", "# Workflow 08:"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("Workflow 10:", messages[0])

    def test_workflow_title_repeating_version_is_detected(self):
        self._write(WORKFLOW, VALID_WORKFLOW.replace("Release\n", "Release (v1.2.0)\n"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("versión", messages[0])

    def test_workflow_missing_field_is_detected(self):
        self._write(WORKFLOW, VALID_WORKFLOW.replace('category: "workflows/deployment"\n', ""))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("category", messages[0])

    def test_workflow_without_suffix_is_detected(self):
        self._write("workflows/07_full_qa_pipeline.md", VALID_WORKFLOW.replace("10_release_workflow", "07_full_qa_pipeline"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("_workflow.md", messages[0])

    def test_repeated_workflow_number_is_detected(self):
        self._write(WORKFLOW, VALID_WORKFLOW)
        self._write("workflows/10_other_workflow.md", VALID_WORKFLOW.replace("10_release_workflow", "10_other_workflow"))

        _, violations, messages = run_checks(self.agents_dir)

        self.assertEqual(violations, 1)
        self.assertIn("se repite", messages[0])


if __name__ == "__main__":
    unittest.main()
