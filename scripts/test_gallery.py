"""Current public style assets and artifact boundaries; browser QA is separate."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

from build_gallery_site import build_site, PAGE_FILES, EXAMPLE_FILES
from check import png_dimensions, svg_dimensions

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / "docs" / "gallery"
EXPECTED = {"sketch": ("手绘线稿", "archive-sketch", "flow"),
            "planes": ("终端色域", "device-planes", "planes")}


class GalleryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((GALLERY / "manifest.json").read_text(encoding="utf-8"))
        cls.items = cls.manifest["items"]

    def test_two_current_styles_and_valid_assets(self):
        self.assertEqual([item["id"] for item in self.items], list(EXPECTED))
        for item in self.items:
            identifier = item["id"]
            name, source, composition = EXPECTED[identifier]
            self.assertEqual(item["name"], name)
            self.assertTrue(item["prompt"].strip())
            self.assertLessEqual(len(item["prompt"]), 400)
            self.assertNotIn("productionBrief", item)
            for field, filename in zip(("scene", "svg", "png", "thumbnail"), EXAMPLE_FILES):
                relative = f"examples/{identifier}/{filename}"
                self.assertEqual(item[field], relative)
                self.assertTrue((GALLERY / relative).is_file(), relative)
            original = ROOT / "docs/verification/graph-workflow-20261014/examples" / source / "round-0"
            document = json.loads((GALLERY / item["scene"]).read_text(encoding="utf-8"))
            self.assertEqual(document, json.loads((original / "document.json").read_text(encoding="utf-8")))
            self.assertEqual(document["presentation"], {"style": name, "composition": composition})
            svg = (GALLERY / item["svg"]).read_text(encoding="utf-8")
            self.assertEqual(svg_dimensions(svg), png_dimensions((GALLERY / item["png"]).read_bytes()))
            self.assertEqual(png_dimensions((GALLERY / item["thumbnail"]).read_bytes())[0], 1200)
            for filename in ("diagram.svg", "diagram.png", "preview-1200.png"):
                self.assertEqual((GALLERY / "examples" / identifier / filename).read_bytes(),
                                 (original / filename).read_bytes())
            labels = " ".join(ET.fromstring(svg).itertext())
            for node in document["scene"]["nodes"]:
                self.assertIn(node["label"], labels)

    @unittest.skipUnless(shutil.which("node"), "Node unavailable")
    def test_documents_pass_real_graph_normalization(self):
        renderer = (ROOT / "skills/musedraw/scripts/render_graph.mjs").as_uri()
        script = (
            "import fs from 'node:fs'; import assert from 'node:assert/strict';"
            f"import {{normalizeGraph}} from {json.dumps(renderer)};"
            "for (const file of process.argv.slice(1)) {"
            "const document = JSON.parse(fs.readFileSync(file, 'utf8'));"
            "assert.deepEqual(normalizeGraph(document.scene), document.scene); }"
        )
        result = subprocess.run([shutil.which("node"), "--input-type=module", "-e", script,
                                 *[str(GALLERY / item["scene"]) for item in self.items]],
                                capture_output=True, text=True, encoding="utf-8", timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_no_private_material(self):
        forbidden = re.compile(r"\b[A-Za-z]:[\\/]|file:///|/(?:Users|home)/|sk-[A-Za-z0-9]{16,}")
        files = [GALLERY / filename for filename in PAGE_FILES]
        files += [GALLERY / item[field] for item in self.items for field in ("scene", "svg")]
        for file in files:
            self.assertIsNone(forbidden.search(file.read_text(encoding="utf-8")), str(file.relative_to(ROOT)))

    def test_pages_build_excludes_historical_files_and_replaces_stale_output(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-site-test-") as scratch:
            root = Path(scratch)
            gallery = root / "docs/gallery"
            gallery.mkdir(parents=True)
            for filename in PAGE_FILES:
                shutil.copyfile(GALLERY / filename, gallery / filename)
            for identifier in EXPECTED:
                shutil.copytree(GALLERY / "examples" / identifier, gallery / "examples" / identifier)
            shutil.copytree(ROOT / "assets/brand", root / "assets/brand")
            historical = root / "docs/gallery/cases/001"
            historical.mkdir(parents=True, exist_ok=True)
            (historical / "old.drawio").touch()
            stale = root / "output/site/docs/gallery/cases/100"
            stale.mkdir(parents=True)
            (stale / "old.svg").touch()
            site = build_site(root)
            public = site / "docs/gallery"
            expected = set(PAGE_FILES) | {f"examples/{identifier}/{filename}"
                                        for identifier in EXPECTED for filename in EXAMPLE_FILES}
            self.assertEqual({file.relative_to(public).as_posix() for file in public.rglob("*") if file.is_file()}, expected)
            self.assertFalse((public / "cases").exists())
            self.assertTrue((site / "assets/brand/mark.svg").is_file())
            self.assertTrue((site / ".nojekyll").is_file())


if __name__ == "__main__":
    unittest.main()
