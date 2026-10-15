"""Exercise the new scene entrypoint without network, fonts or model calls."""
from pathlib import Path
import shutil
import subprocess
import unittest


class SceneEngineTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_static_export_and_named_theme_boundaries(self):
        result = subprocess.run([shutil.which('node'), str(Path(__file__).with_suffix('.mjs'))],
                                capture_output=True, text=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
