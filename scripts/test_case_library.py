"""Check the complete source collection and its on-demand Skill entry."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

from build_gallery_site import visual_case_files, VISUAL_CASE_FILES

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "gallery/collections/visual-cases"
SCRIPT = ROOT / "skills/musedraw/scripts/case-library.mjs"


class CaseLibraryTests(unittest.TestCase):
    def test_cli_exact_replay_keeps_authored_fonts_in_both_modes(self):
        # The CLI used to rewrite Arial as a theme sans stack, and Arial without
        # a generic fallback as a serif stack. Rendering the scene alone did not
        # exercise this export-time change.
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" '
               'viewBox="0 0 600 400" data-theme="editorial">'
               '<text x="30" y="50" font-family="Arial">OPEN HOUSE</text>'
               '<text x="30" y="90" font-family="Georgia, serif" font-style="italic">Space for ideas</text>'
               '<path d="M30 120L400 120" stroke="black"/></svg>')
        scene = {"type": "vector", "theme": "editorial", "size": [600, 400], "nativeSvg": svg}
        with tempfile.TemporaryDirectory(prefix="musedraw-case-fonts-") as temp:
            folder = Path(temp) / "case with spaces"
            folder.mkdir()
            source = folder / "scene.json"
            source.write_text(json.dumps(scene), encoding="utf-8")
            for mode in ("system", "bundled"):
                with self.subTest(mode=mode):
                    output = folder / mode
                    result = subprocess.run(["node", str(ROOT / "skills/musedraw/scripts/musedraw.mjs"),
                                             "render", str(source), "--out", str(output), "--svg-only",
                                             "--font-mode", mode], cwd=folder, capture_output=True,
                                            text=True, encoding="utf-8", timeout=30)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual((output / "diagram.svg").read_text(encoding="utf-8"), svg + "\n")
                    self.assertEqual(json.loads(source.read_text(encoding="utf-8")), scene)

    def test_every_supplied_case_is_reachable_with_original_sources(self):
        catalog = json.loads((LIBRARY / "catalog.json").read_text(encoding="utf-8"))
        registry = json.loads((ROOT / "skills/musedraw/assets/case-library/index.json").read_text(encoding="utf-8"))
        self.assertEqual(catalog["count"], 180)
        self.assertEqual({i["id"] for i in catalog["items"]}, {i["id"] for i in registry["items"]})
        resources = visual_case_files(ROOT)
        self.assertEqual(len(resources), 4 + 180 * len(VISUAL_CASE_FILES))
        for item in catalog["items"]:
            with self.subTest(case=item["id"]):
                folder = LIBRARY / item["id"]
                self.assertEqual(hashlib.sha256((folder / "original.png").read_bytes()).hexdigest(), item["sourceSha256"])
                self.assertEqual(hashlib.sha256((folder / "source.svg").read_bytes()).hexdigest(), item["sourceSvgSha256"])
                scene = json.loads((folder / "scene.json").read_text(encoding="utf-8"))
                self.assertEqual(scene["nativeSvg"], (folder / "diagram.svg").read_text(encoding="utf-8"))
                artwork = ET.fromstring(scene["nativeSvg"])
                self.assertEqual(artwork.get("data-theme"), scene["theme"])
                self.assertTrue(any(n.tag.endswith("text") for n in artwork.iter()))
                self.assertEqual(item["status"], "included")

    def test_search_prepare_and_existing_work_preservation(self):
        def run(*args):
            return subprocess.run(["node", str(SCRIPT), *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        result = run("--search", "补书")
        self.assertEqual(result.returncode, 0, result.stderr)
        found = json.loads(result.stdout)
        self.assertEqual(found["matched"], 1)
        self.assertEqual(found["items"][0]["id"], "p01-guji-xiufu")
        with tempfile.TemporaryDirectory(prefix="musedraw-case-library-") as temp:
            output = Path(temp) / "job"
            result = run("--id", "p01-guji-xiufu", "--library", str(LIBRARY), "--out", str(output))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads((output / "scene.json").read_text(encoding="utf-8"))["type"], "vector")
            (output / "prompt.md").write_text("User's edited brief", encoding="utf-8")
            original_scene = (output / "scene.json").read_bytes()
            refused = run("--id", "p01-guji-xiufu", "--out", str(output))
            self.assertNotEqual(refused.returncode, 0)
            self.assertEqual((output / "prompt.md").read_text(encoding="utf-8"), "User's edited brief")
            self.assertEqual((output / "scene.json").read_bytes(), original_scene)
        self.assertNotEqual(run("--id", "../../outside", "--out", "unused").returncode, 0)


if __name__ == "__main__":
    unittest.main()
