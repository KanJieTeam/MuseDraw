"""Native drawio text and path regressions, collected by scripts/check.py."""
from pathlib import Path
import shutil
import subprocess
import unittest


class SceneDrawioTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node unavailable")
    def test_native_multiline_text_and_svg_path_conversion(self):
        result = subprocess.run([shutil.which("node"), str(Path(__file__).with_suffix(".mjs"))],
                                capture_output=True, text=True, encoding="utf-8", timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
