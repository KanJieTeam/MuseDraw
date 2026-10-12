"""Offline invariants for the public collection; browser/editor QA is separate."""
import json
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / "docs" / "gallery"


class GalleryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((GALLERY / "manifest.json").read_text(encoding="utf-8"))
        cls.items = cls.manifest["items"]

    def test_complete_portable_collection(self):
        self.assertEqual(len(self.items), 100)
        self.assertEqual({item["id"] for item in self.items}, set(range(1, 101)))
        self.assertLess((GALLERY / "manifest.json").stat().st_size, 300_000)
        for item in self.items:
            self.assertEqual(item["number"], f'{item["id"]:03}')
            self.assertIn(item["view"], {"component", "capability", "deployment"})
            for field in ("png", "svg", "thumbnail", "drawio"):
                relative = item[field]
                self.assertTrue(re.fullmatch(r"cases/\d{3}/(?:preview\.png|diagram\.(?:svg|png|drawio))", relative))
                self.assertTrue((GALLERY / relative).is_file(), relative)
            self.assertEqual(item["prompt"], (GALLERY / "cases" / item["number"] / "prompt.txt").read_text(encoding="utf-8").strip())

    def test_no_private_material(self):
        forbidden = re.compile(r"\b[A-Za-z]:[\\/]|file:///|/(?:Users|home)/|actuallyViewed|reference-contacts|downloadData|sk-[A-Za-z0-9]{16,}")
        for file in GALLERY.rglob("*"):
            if file.suffix in {".json", ".txt", ".svg", ".drawio", ".html", ".mjs", ".css"}:
                self.assertIsNone(forbidden.search(file.read_text(encoding="utf-8")), str(file.relative_to(ROOT)))
        self.assertFalse((GALLERY / "reference-contacts").exists())

    def test_native_drawio_objects_and_relations(self):
        for item in self.items:
            root = ET.parse(GALLERY / item["drawio"]).getroot()
            cells = root.findall(".//mxCell")
            ids = {cell.get("id") for cell in cells}
            self.assertEqual(len(ids), len(cells), item["number"])
            self.assertGreater(len(cells), 10, item["number"])
            self.assertTrue(any(cell.get("vertex") == "1" and cell.get("value") for cell in cells), item["number"])
            for cell in cells:
                style = cell.get("style", "")
                self.assertNotIn("shape=image", style, item["number"])
                self.assertNotIn("image=data:", style, item["number"])
                if cell.get("parent"):
                    self.assertIn(cell.get("parent"), ids, item["number"])
                if cell.get("edge") == "1":
                    if cell.get("source"):
                        self.assertIn(cell.get("source"), ids, item["number"])
                    if cell.get("target"):
                        self.assertIn(cell.get("target"), ids, item["number"])

    def test_editor_origin_guard_and_opt_in(self):
        script = (GALLERY / "gallery.mjs").read_text(encoding="utf-8")
        self.assertIn("event.origin !== editorOrigin", script)
        self.assertIn("event.source !== session.frame?.contentWindow", script)
        self.assertIn("$('edit').addEventListener('click', openEditor)", script)
        self.assertNotIn("postMessage('*'", script)
        html = (GALLERY / "index.html").read_text(encoding="utf-8")
        self.assertIn("frame-src https://embed.diagrams.net", html)
        self.assertNotIn("<iframe", html)


if __name__ == "__main__":
    unittest.main()
