"""Portable semantic-scene fixtures; actual-font matrix is an explicit separate run."""
from pathlib import Path
import shutil
import subprocess
import unittest


class SemanticSceneTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_semantic_scene_assertions(self):
        script = Path(__file__).with_suffix('.mjs')
        result = subprocess.run([shutil.which('node'), str(script)],
                                capture_output=True, text=True, encoding='utf-8', timeout=90)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"passed":true', result.stdout)


if __name__ == '__main__':
    unittest.main()
