#!/usr/bin/env python3
import os
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "check_rules_freshness.sh"))
RULES = "docs/04_governance_and_quality/rules"
RULE_NAMES = ("domain", "backend", "frontend", "database", "security", "testing", "git")


class CheckRulesFreshnessTests(unittest.TestCase):
    """Anti-Gate-Hueco: lo que no se puede verificar nunca sale como alineado."""

    def setUp(self):
        self.repo = tempfile.mkdtemp()
        self._git("init", "-q")
        self._git("config", "user.email", "test@example.invalid")
        self._git("config", "user.name", "test")

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def _git(self, *args, env=None):
        subprocess.run(["git", *args], cwd=self.repo, check=True, capture_output=True, env=env)

    def _write(self, rel, content="x\n"):
        path = os.path.join(self.repo, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def _commit(self, message):
        # Fechas explícitas y crecientes: el script compara marcas de tiempo en segundos.
        self.commits = getattr(self, "commits", 0) + 1
        stamp = f"2026-09-{self.commits:02d}T10:00:00+00:00"
        env = {**os.environ, "GIT_AUTHOR_DATE": stamp, "GIT_COMMITTER_DATE": stamp}
        self._git("add", "-A")
        self._git("commit", "-q", "-m", message, env=env)

    def _run(self):
        return subprocess.run(["bash", SCRIPT], cwd=self.repo, capture_output=True, text=True)

    def _all_rules(self):
        for name in RULE_NAMES:
            self._write(f"{RULES}/{name}_rules.md")

    def test_committed_complete_rules_are_verified(self):
        self._write("docs/02_architecture_design/03_domain_model.md")
        self._commit("fuente")
        self._all_rules()
        self._commit("reglas")

        result = self._run()

        self.assertEqual(result.returncode, 0)
        self.assertIn("✅", result.stdout)

    def test_missing_rules_directory_is_not_verifiable(self):
        self._write("README.md")
        self._commit("vacío")

        result = self._run()

        self.assertEqual(result.returncode, 2)
        self.assertIn("SK-27", result.stdout)
        self.assertNotIn("✅", result.stdout)

    def test_missing_rule_file_is_not_verifiable(self):
        self._all_rules()
        os.remove(os.path.join(self.repo, RULES, "security_rules.md"))
        self._commit("reglas incompletas")

        result = self._run()

        self.assertEqual(result.returncode, 2)
        self.assertIn("security_rules.md", result.stdout)
        self.assertNotIn("✅", result.stdout)

    def test_uncommitted_rule_is_not_verifiable(self):
        self._all_rules()
        self._commit("reglas")
        self._write(f"{RULES}/testing_rules.md", "regla nueva sin commit\n")
        os.remove(os.path.join(self.repo, RULES, "git_rules.md"))
        self._write(f"{RULES}/git_rules.md", "recreada sin commit\n")
        self._git("rm", "-q", "--cached", f"{RULES}/git_rules.md")

        result = self._run()

        self.assertEqual(result.returncode, 2)
        self.assertIn("git_rules.md", result.stdout)
        self.assertNotIn("✅", result.stdout)

    def test_drift_is_reported_but_stays_informational(self):
        self._all_rules()
        self._commit("reglas")
        self._write("docs/02_architecture_design/03_domain_model.md", "cambio posterior\n")
        self._commit("fuente posterior")

        result = self._run()

        self.assertEqual(result.returncode, 0)
        self.assertIn("Posible drift", result.stdout)
        self.assertNotIn("✅", result.stdout)


if __name__ == "__main__":
    unittest.main()
