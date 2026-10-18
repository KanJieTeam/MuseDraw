"""Exercise semantic composition through the standard repository check."""
from pathlib import Path
import shutil
import subprocess
import unittest


class CompositionTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node unavailable')
    def test_compositions(self):
        for name in ['test_compose.mjs', 'test_compose_flow.mjs']:
            result = subprocess.run([shutil.which('node'), '--test', str(Path(__file__).with_name(name))],
                                    capture_output=True, text=True, encoding='utf-8', timeout=60)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
