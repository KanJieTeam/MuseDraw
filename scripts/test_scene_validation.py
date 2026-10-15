"""Run scene validation regressions without npm packages or a browser."""
from pathlib import Path
import shutil
import subprocess
import unittest


class SceneValidationTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_scene_preflight_and_cli(self):
        result = subprocess.run(
            [shutil.which('node'), '--test', str(Path(__file__).with_suffix('.mjs'))],
            capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
