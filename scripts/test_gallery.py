"""Check the user-supplied catalog, safe artwork, engine and Pages boundary."""
import json
import base64
import hashlib
from pathlib import Path
import shutil
import subprocess
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET
from urllib.parse import unquote
import zlib

from build_gallery_site import build_site, CASE_FILES, PAGE_FILES
from check import svg_dimensions

ROOT = Path(__file__).resolve().parents[1]


class GalleryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "gallery/catalog.json").read_text(encoding="utf-8"))
        cls.items = cls.catalog["items"]

    def test_gallery_is_a_linked_website_with_all_current_style_choices(self):
        url = "https://kanjieteam.github.io/MuseDraw/"
        for filename in ("README.md", "README.zh-CN.md", "README.en.md"):
            text = (ROOT / filename).read_text(encoding="utf-8")
            self.assertIn(f'href="{url}"', text)
            self.assertIn(f']({url})', text)
            self.assertNotIn('href="gallery/README.md"', text)
        styles = json.loads((ROOT / "assets/gallery/styles.json").read_text(encoding="utf-8"))
        self.assertEqual(set(styles), {item["theme"] for item in self.items})
        for key, style in styles.items():
            theme = json.loads((ROOT / "skills/musedraw/themes" / f"{key}.json").read_text(encoding="utf-8"))
            self.assertEqual(style["name"], theme["nameZh"])
            self.assertTrue(style["swatches"])
            for color in style["swatches"]:
                self.assertRegex(color, r"^#[0-9a-fA-F]{3,8}$")

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

    def test_all_100_drawio_files_have_native_shapes_text_and_connected_edges(self):
        for item in self.items:
            with self.subTest(case=item["slug"]):
                folder = ROOT / item["path"]
                text = (folder / "diagram.drawio").read_text(encoding="utf-8")
                self.assertNotRegex(text, r"=(?:NaN|[-+]?Infinity)(?:;|\")", "Native coordinates and ports must be finite")
                self.assertNotRegex(text, r"(?i)<!\s*(?:DOCTYPE|ENTITY)\b|data:image|<\s*(?:image|svg|foreignObject)\b")
                root = ET.fromstring(text)
                self.assertEqual(root.tag, "mxfile")
                self.assertIsNotNone(root.find(".//mxGraphModel/root"))
                cells = root.findall(".//mxCell")
                by_id = {cell.get("id"): cell for cell in cells}
                self.assertEqual(len(by_id), len(cells))
                self.assertTrue(all(by_id))
                vertices = [cell for cell in cells if cell.get("vertex") == "1"]
                self.assertTrue(any(cell.get("value", "").strip() for cell in vertices), "Native editable text is required")
                self.assertTrue(any("shape=stencil(" in cell.get("style", "") for cell in vertices), "Native vector shapes are required")
                for cell in cells:
                    if cell.get("parent"):
                        self.assertIn(cell.get("parent"), by_id)
                    style = cell.get("style", "")
                    self.assertNotRegex(style, r"(?i)(?:^|;)(?:shape=image(?:;|$)|image=)")
                    if cell.get("vertex") == "1":
                        self.assertIsNotNone(cell.find("mxGeometry"))
                    if cell.get("edge") == "1":
                        for endpoint in ("source", "target"):
                            self.assertIn(cell.get(endpoint), by_id, "Edges must retain both editable terminals")
                            self.assertEqual(by_id[cell.get(endpoint)].get("vertex"), "1")
                        self.assertIsNotNone(cell.find("mxGeometry"))
                    for encoded in re.findall(r"shape=stencil\(([^)]+)\)", style):
                        definition = unquote(zlib.decompress(base64.b64decode(encoded), -15).decode("utf-8"))
                        shape = ET.fromstring(definition)
                        self.assertEqual(shape.tag, "shape")
                        self.assertFalse(any(element.tag.lower() in {"image", "svg", "foreignobject", "include-shape"} for element in shape.iter()))
                        self.assertTrue(any(element.tag in {"path", "rect", "ellipse"} for element in shape.iter()))
                scene = json.loads((folder / "scene.json").read_text(encoding="utf-8"))
                if scene.get("edges"):
                    self.assertGreaterEqual(sum(cell.get("edge") == "1" for cell in cells), len(scene["edges"]))

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
            html = (site / "index.html").read_text(encoding="utf-8")
            for filename in ("gallery.css", "gallery.mjs"):
                version = hashlib.sha256((site / filename).read_bytes()).hexdigest()[:12]
                self.assertIn(f'"{filename}?v={version}"', html)
            expected = set(PAGE_FILES) | {".nojekyll", "gallery/catalog.json", "gallery/prompts.json", "docs/gallery/index.html"}
            expected |= {f'{item["path"]}/{filename}' for item in self.items for filename in CASE_FILES}
            expected |= {file.relative_to(root).as_posix() for file in (root / "assets/brand").rglob("*") if file.is_file()}
            self.assertEqual({file.relative_to(site).as_posix() for file in site.rglob("*") if file.is_file()}, expected)
            self.assertEqual([file.relative_to(site / "docs").as_posix() for file in (site / "docs").rglob("*") if file.is_file()], ["gallery/index.html"])
            redirect = (site / "docs/gallery/index.html").read_text(encoding="utf-8")
            self.assertIn('content="0;url=../../"', redirect)
            self.assertFalse((site / "docs/gallery/cases").exists())
            self.assertFalse((site / "examples").exists())
            self.assertFalse((site / "gallery/cases").exists())
            for item in self.items:
                for filename in CASE_FILES:
                    relative = Path(item["path"]) / filename
                    self.assertEqual((site / relative).read_bytes(), (ROOT / relative).read_bytes())


if __name__ == "__main__":
    unittest.main()
