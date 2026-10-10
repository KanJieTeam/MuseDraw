"""Offline tests for dependency discovery and argument-safe rendering."""

import os
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import export_png


class ExportPngTests(unittest.TestCase):
    def test_native_source_passes_preflight(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.svg"
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><text x="4" y="20">Figure</text></svg>',
                encoding="utf-8",
            )
            export_png.validate_source(source)

    def test_active_or_external_source_is_rejected(self):
        payloads = (
            '<script>window.previewMarker = true</script>',
            '<rect width="10" height="10" onclick="window.previewMarker = true"/>',
            '<image href="https://example.org/picture.png"/>',
            '<foreignObject width="10" height="10"><div>HTML</div></foreignObject>',
        )
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.svg"
            for payload in payloads:
                with self.subTest(payload=payload):
                    source.write_text(
                        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">{payload}</svg>',
                        encoding="utf-8",
                    )
                    with self.assertRaises(ValueError):
                        export_png.validate_source(source)

    def test_unsafe_source_never_probes_or_launches_tools(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "source.svg", Path(directory) / "output.png"
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><script>window.previewMarker = true</script></svg>',
                encoding="utf-8",
            )
            with patch("sys.argv", ["export_png.py", str(source), str(output)]):
                with patch("export_png.shutil.which") as which, patch("export_png.subprocess.run") as run:
                    with redirect_stderr(StringIO()), self.assertRaises(SystemExit) as raised:
                        export_png.main()
                    self.assertEqual(raised.exception.code, 2)
                    which.assert_not_called()
                    run.assert_not_called()
            self.assertFalse(output.exists())
            self.assertFalse(Path(str(output) + ".checks.json").exists())

    def test_missing_explicit_module_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "does not exist"):
                export_png.discover_playwright("node", str(Path(directory) / "missing.mjs"))

    def test_explicit_module_does_not_probe_or_install(self):
        with tempfile.TemporaryDirectory() as directory:
            module = Path(directory) / "module.mjs"
            module.touch()
            with patch("export_png.subprocess.run") as run:
                self.assertEqual(export_png.discover_playwright("node", str(module)), module)
                run.assert_not_called()

    def test_missing_dependency_is_disclosed(self):
        with patch.dict(os.environ, {"MUSEDRAW_PLAYWRIGHT": ""}):
            with patch("export_png.subprocess.run") as run:
                run.return_value.returncode = 1
                with self.assertRaisesRegex(ValueError, "No dependencies have been installed"):
                    export_png.discover_playwright("node")
                self.assertNotIn("npm", run.call_args.args[0])

    def test_missing_explicit_browser_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "does not exist"):
                export_png.discover_browser(str(Path(directory) / "missing-browser"))

    def test_command_keeps_paths_as_separate_arguments(self):
        command = export_png.build_command(
            "node", Path("a folder/input.svg"), Path("a folder/output.png"),
            Path("tools folder/index.mjs"), Path("browser folder/chrome"),
        )
        self.assertIn(str(Path("a folder/input.svg")), command)
        self.assertIn(str(Path("tools folder/index.mjs")), command)
        self.assertEqual(command[-2:], ["--browser", str(Path("browser folder/chrome"))])


if __name__ == "__main__":
    unittest.main()
