#!/usr/bin/env python3
import os
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "sync_claude_skills.sh"))
MARKER = "# generado por .agents/scripts/sync_claude_skills.sh — no editar a mano"
COMMAND = '---\nname: {name}\ndescription: "x"\n---\n\n# /{name}\n'


class SyncClaudeSkillsTests(unittest.TestCase):
    def setUp(self):
        self.project = tempfile.mkdtemp()
        self.agents_dir = os.path.join(self.project, ".agents")
        os.makedirs(os.path.join(self.agents_dir, "scripts"))
        shutil.copy(SCRIPT, os.path.join(self.agents_dir, "scripts", "sync_claude_skills.sh"))
        self.dest = os.path.join(self.project, ".claude", "skills")

    def tearDown(self):
        shutil.rmtree(self.project, ignore_errors=True)

    def _add_command(self, name):
        path = os.path.join(self.agents_dir, "skills", name)
        os.makedirs(path, exist_ok=True)
        with open(os.path.join(path, "SKILL.md"), "w", encoding="utf-8") as f:
            f.write(COMMAND.format(name=name))

    def _run(self):
        return subprocess.run(
            ["bash", os.path.join(self.agents_dir, "scripts", "sync_claude_skills.sh")],
            capture_output=True, text=True, check=True,
        )

    def _read(self, name):
        with open(os.path.join(self.dest, name, "SKILL.md"), encoding="utf-8") as f:
            return f.read()

    def test_generates_claude_copy_with_model_invocation_disabled(self):
        self._add_command("momoy-dev")

        self._run()

        content = self._read("momoy-dev")
        self.assertTrue(content.startswith("---\n" + MARKER + "\ndisable-model-invocation: true\nname: momoy-dev\n"))
        self.assertIn("# /momoy-dev", content)

    def test_bare_momoy_command_is_synced(self):
        self._add_command("momoy")

        self._run()

        self.assertIn("name: momoy\n", self._read("momoy"))

    def test_is_idempotent(self):
        self._add_command("momoy-dev")

        self._run()
        first = self._read("momoy-dev")
        self._run()

        self.assertEqual(first, self._read("momoy-dev"))

    def test_non_momoy_skills_and_procedure_catalog_are_ignored(self):
        self._add_command("pdf-tools")
        os.makedirs(os.path.join(self.agents_dir, "skills", "specs"))

        self._run()

        self.assertFalse(os.path.exists(os.path.join(self.dest, "pdf-tools")))
        self.assertFalse(os.path.exists(os.path.join(self.dest, "specs")))

    def test_hand_written_claude_skill_is_never_overwritten(self):
        self._add_command("momoy-dev")
        os.makedirs(os.path.join(self.dest, "momoy-dev"))
        with open(os.path.join(self.dest, "momoy-dev", "SKILL.md"), "w", encoding="utf-8") as f:
            f.write("propio del proyecto\n")

        result = self._run()

        self.assertEqual(self._read("momoy-dev"), "propio del proyecto\n")
        self.assertIn("no se toca", result.stdout)

    def test_stale_generated_copy_is_removed_but_hand_written_one_is_kept(self):
        self._add_command("momoy-old")
        self._run()
        shutil.rmtree(os.path.join(self.agents_dir, "skills", "momoy-old"))
        os.makedirs(os.path.join(self.dest, "momoy-custom"))
        with open(os.path.join(self.dest, "momoy-custom", "SKILL.md"), "w", encoding="utf-8") as f:
            f.write("propio del proyecto\n")

        self._run()

        self.assertFalse(os.path.exists(os.path.join(self.dest, "momoy-old")))
        self.assertEqual(self._read("momoy-custom"), "propio del proyecto\n")


if __name__ == "__main__":
    unittest.main()
