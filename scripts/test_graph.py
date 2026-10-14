"""Offline graph renderer invariants; live model and browser checks are separate."""
from pathlib import Path
import shutil
import subprocess
import unittest


class GraphTests(unittest.TestCase):
    def test_native_graph_and_atomic_edit_invariants(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node.js unavailable')
        result = subprocess.run([node, str(Path(__file__).with_suffix('.mjs'))],
                                capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
