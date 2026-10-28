import json
from pathlib import Path
import tempfile
import unittest

from prepare_visual_review import prepare, verify
from test_check import png


class VisualReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ("control", "candidate"):
            (self.root / f"{name}.png").write_bytes(png(100, 50))
        self.config = {"brief": "Create the supplied event poster.", "candidates": [
            {"id": name, "images": {"poster": str(self.root / f"{name}.png")}} for name in ("control", "candidate")]}

    def test_equal_frozen_evidence_and_private_mapping(self):
        packet = prepare(self.config, self.root / "round")
        self.assertEqual(verify(packet), [])
        key = json.loads((packet.parent / "key.json").read_text())
        self.assertEqual({v["id"] for v in key["mapping"].values()}, {"control", "candidate"})
        for filename in (packet / "manifest.json", packet / "brief.txt"):
            text = filename.read_text()
            self.assertNotIn(str(self.root), text)
            self.assertNotIn("control", text)
            self.assertNotIn("candidate", text)
        first = (packet / "A/poster.png").read_bytes()
        (self.root / "control.png").write_bytes(png(40, 20))
        self.assertEqual((packet / "A/poster.png").read_bytes(), first)
        self.assertEqual(verify(packet), [])
        with self.assertRaises(FileExistsError):
            prepare(self.config, packet.parent)
        self.assertEqual((packet / "A/poster.png").read_bytes(), first)

    def test_missing_view_or_unequal_size_rejected_before_writing(self):
        self.config["candidates"][1]["images"]["mobile"] = str(self.root / "candidate.png")
        with self.assertRaisesRegex(ValueError, "same nonempty view"):
            prepare(self.config, self.root / "missing")
        self.assertFalse((self.root / "missing").exists())
        del self.config["candidates"][1]["images"]["mobile"]
        (self.root / "candidate.png").write_bytes(png(99, 50))
        with self.assertRaisesRegex(ValueError, "Unequal image dimensions"):
            prepare(self.config, self.root / "unequal")
        self.assertFalse((self.root / "unequal").exists())

    def test_changed_or_missing_evidence_is_reported(self):
        packet = prepare(self.config, self.root / "round")
        (packet / "A/poster.png").write_bytes(png(80, 40))
        (packet / "B/poster.png").unlink()
        (packet / "brief.txt").write_text("Changed brief")
        self.assertEqual(set(verify(packet)), {"A/poster.png", "B/poster.png", "brief.txt"})

    def test_full_page_height_can_differ_without_rescaling_width(self):
        self.config["fullPageViews"] = ["poster"]
        (self.root / "candidate.png").write_bytes(png(100, 80))
        packet = prepare(self.config, self.root / "full")
        self.assertEqual(verify(packet), [])
        manifest = json.loads((packet / "manifest.json").read_text())
        self.assertEqual(sorted(v["poster"][1] for v in manifest["viewDimensions"].values()), [50, 80])
        (self.root / "candidate.png").write_bytes(png(90, 80))
        with self.assertRaisesRegex(ValueError, "Unequal image dimensions"):
            prepare(self.config, self.root / "wrong-width")

    def test_view_path_traversal_and_duplicate_arm_rejected(self):
        self.config["candidates"][1]["id"] = "control"
        with self.assertRaisesRegex(ValueError, "distinctly identified"):
            prepare(self.config, self.root / "duplicate")
        self.config["candidates"][1]["id"] = "candidate"
        for c in self.config["candidates"]:
            c["images"] = {"../escape": str(self.root / "control.png")}
        with self.assertRaisesRegex(ValueError, "not paths"):
            prepare(self.config, self.root / "escaped")
