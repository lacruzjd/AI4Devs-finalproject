#!/usr/bin/env python3
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
from source_repo import source_files, source_root  # noqa: E402


class SourceRepoTests(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.agents_dir = os.path.join(self.root, ".agents")
        self._write(".agents/README.md", "# momoy\n")
        self._write("CONTRIBUTING.md", "# Contribuir\n")
        self._write("docs/adr/ADR-001-x.md", "# ADR\n")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def _write(self, rel, content):
        path = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def test_installed_project_is_not_a_source_repo(self):
        self.assertIsNone(source_root(self.agents_dir))
        self.assertEqual(source_files(self.agents_dir, {".md"}), [])

    def test_source_repo_lists_maintainer_files_outside_agents(self):
        self._write("docs/system_map/momoy_system_map.html", "<html></html>")

        files = [os.path.relpath(p, self.root) for p in source_files(self.agents_dir, {".md"})]

        self.assertEqual(files, ["CONTRIBUTING.md", os.path.join("docs", "adr", "ADR-001-x.md")])


if __name__ == "__main__":
    unittest.main()
