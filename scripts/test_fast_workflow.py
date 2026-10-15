"""Offline fast-path regressions, collected by scripts/check.py."""
from pathlib import Path
import shutil
import subprocess
import unittest


class FastWorkflowTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_offline_fast_path(self):
        result = subprocess.run([shutil.which('node'), '--test', str(Path(__file__).with_suffix('.mjs'))],
                                capture_output=True, text=True, encoding='utf-8', timeout=45)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
