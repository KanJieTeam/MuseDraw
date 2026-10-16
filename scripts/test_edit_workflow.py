"""Bounded layout and transactional edit regressions."""
from pathlib import Path
import shutil
import subprocess
import unittest


class EditWorkflowTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_layout_and_patches(self):
        result = subprocess.run([shutil.which('node'), '--test', str(Path(__file__).with_suffix('.mjs'))],
                                capture_output=True, text=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
