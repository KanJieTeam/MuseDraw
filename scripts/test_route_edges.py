"""Run observable routing invariants without a browser or model service."""
from pathlib import Path
import shutil
import subprocess
import unittest


class RouteEdgesTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node unavailable")
    def test_geometry_regressions(self):
        result = subprocess.run([shutil.which("node"), str(Path(__file__).with_suffix(".mjs"))],
                                capture_output=True, encoding="utf-8", timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
