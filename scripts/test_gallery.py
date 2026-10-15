"""Check the user-supplied catalog, safe artwork, engine and Pages boundary."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

from build_gallery_site import build_site, CASE_FILES, PAGE_FILES
from check import svg_dimensions

ROOT = Path(__file__).resolve().parents[1]


class GalleryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "gallery/catalog.json").read_text(encoding="utf-8"))
        cls.items = cls.catalog["items"]

    def test_current_catalog_and_original_artwork(self):
        self.assertEqual(len(self.items), 100)
        self.assertEqual(len({item["slug"] for item in self.items}), 100)
        self.assertEqual(len({item["theme"] for item in self.items}), 20)
        self.assertEqual(sum(item["status"] == "flagship" for item in self.items), 20)
        themes = {file.stem for file in (ROOT / "skills/musedraw/themes").glob("*.json")}
        self.assertEqual({item["theme"] for item in self.items}, themes)
        for item in self.items:
            with self.subTest(case=item["slug"]):
                self.assertEqual(item["path"], f'gallery/{item["slug"]}')
                self.assertIn(item["status"], {"flagship", "reviewed", "preview", "planned"})
                folder = ROOT / item["path"]
                for filename in CASE_FILES:
                    self.assertTrue((folder / filename).is_file(), f'{item["slug"]}/{filename}')
                scene = json.loads((folder / "scene.json").read_text(encoding="utf-8"))
                self.assertEqual(scene["theme"], item["theme"])
                self.assertEqual(" ".join(scene["title"].split()), " ".join(item["title"].split()))
                svg = (folder / "diagram.svg").read_text(encoding="utf-8")
                width, height = svg_dimensions(svg)
                self.assertGreater(width, 0)
                self.assertGreater(height, 0)
                self.assertEqual(ET.fromstring(svg).get("data-theme"), item["theme"])
                jpg = (folder / "preview.jpg").read_bytes()
                self.assertTrue(jpg.startswith(b"\xff\xd8") and jpg.endswith(b"\xff\xd9"))
                checks = json.loads((folder / "checks.json").read_text(encoding="utf-8"))
                self.assertEqual(checks["theme"], item["theme"])
                self.assertTrue(checks["passed"])
                self.assertEqual(checks["warnings"], [])
                self.assertEqual(checks["missingFonts"], [])
                prompt = (folder / "prompt.md").read_text(encoding="utf-8")
                self.assertRegex(prompt, r"(?m)^>\s+\S")

    @unittest.skipUnless(shutil.which("node"), "Node unavailable")
    def test_all_100_scenes_render_svg_in_temporary_output(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-v3-engine-") as scratch:
            script = (
                "import fs from 'node:fs/promises';import path from 'node:path';"
                f"import {{render}} from {json.dumps((ROOT / 'skills/musedraw/scripts/engine/render.mjs').as_uri())};"
                f"import {{loadTheme}} from {json.dumps((ROOT / 'skills/musedraw/scripts/musedraw.mjs').as_uri())};"
                f"const root={json.dumps(str(ROOT))},out={json.dumps(scratch)};"
                "const catalog=JSON.parse(await fs.readFile(path.join(root,'gallery/catalog.json'),'utf8'));"
                "for(const item of catalog.items){const scene=JSON.parse(await fs.readFile(path.join(root,item.path,'scene.json'),'utf8'));"
                "const theme=await loadTheme(scene.theme);const svg=render(scene,theme);"
                "await fs.writeFile(path.join(out,item.slug+'.svg'),svg);}"
                "console.log(JSON.stringify({rendered:catalog.items.length}));"
            )
            result = subprocess.run([shutil.which("node"), "--input-type=module", "-e", script],
                                    capture_output=True, text=True, encoding="utf-8", timeout=120)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["rendered"], 100)
            self.assertEqual(len(list(Path(scratch).glob("*.svg"))), 100)
            for file in Path(scratch).glob("*.svg"):
                svg_dimensions(file.read_text(encoding="utf-8"))

    def test_pages_contains_only_current_artwork_and_replaces_stale_output(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-v3-site-") as scratch:
            root = Path(scratch)
            shutil.copytree(ROOT / "gallery", root / "gallery")
            shutil.copytree(ROOT / "assets/gallery", root / "assets/gallery")
            shutil.copytree(ROOT / "assets/brand", root / "assets/brand")
            stale = root / "output/site/docs/gallery/cases/001"
            stale.mkdir(parents=True)
            (stale / "diagram.drawio").touch()
            historical = root / "gallery/cases/002"
            historical.mkdir(parents=True)
            (historical / "old.svg").touch()
            site = build_site(root)
            expected = set(PAGE_FILES) | {".nojekyll", "gallery/catalog.json"}
            expected |= {f'{item["path"]}/{filename}' for item in self.items for filename in CASE_FILES}
            expected |= {file.relative_to(root).as_posix() for file in (root / "assets/brand").rglob("*") if file.is_file()}
            self.assertEqual({file.relative_to(site).as_posix() for file in site.rglob("*") if file.is_file()}, expected)
            self.assertFalse((site / "docs").exists())
            self.assertFalse((site / "examples").exists())
            self.assertFalse((site / "gallery/cases").exists())
            for item in self.items:
                for filename in CASE_FILES:
                    relative = Path(item["path"]) / filename
                    self.assertEqual((site / relative).read_bytes(), (ROOT / relative).read_bytes())


if __name__ == "__main__":
    unittest.main()
