"""Model-host invariants only; this test does not make provider requests."""
from pathlib import Path
import shutil
import subprocess
import unittest


class GraphHostTests(unittest.TestCase):
    def test_tool_execution_and_independent_factual_checks(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('Node.js unavailable')
        source = Path(__file__).with_name('test_deepseek_graph_offline.mjs')
        result = subprocess.run([node, str(source)], capture_output=True,
                                text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
