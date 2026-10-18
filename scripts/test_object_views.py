"""Run object-view identity and foreground regressions in the standard check."""
from pathlib import Path
import shutil
import subprocess
import unittest


class ObjectViewTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_objects_and_layers(self):
        result = subprocess.run(
            [shutil.which('node'), '--test', str(Path(__file__).with_suffix('.mjs')),
             str(Path(__file__).with_name('test_scientific_views.mjs'))],
            capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
