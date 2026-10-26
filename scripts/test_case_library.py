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
