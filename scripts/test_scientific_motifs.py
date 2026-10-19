"""Exercise native scientific object grammar through the standard check."""
from pathlib import Path
import shutil
import subprocess
import unittest

class ScientificMotifTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_native_scientific_objects(self):
        result = subprocess.run([shutil.which('node'), '--test', str(Path(__file__).with_suffix('.mjs')),
                                 str(Path(__file__).with_name('test_scientific_laminate.mjs')),
                                 str(Path(__file__).with_name('test_scientific_layer_grid.mjs')),
                                 str(Path(__file__).with_name('test_scientific_duplex.mjs'))],
                                capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
