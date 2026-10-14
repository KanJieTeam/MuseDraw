"""Meaningful offline-package, privacy and input-confinement fixtures."""
from pathlib import Path
import hashlib
import json
import os
import struct
import tempfile
import unittest
import zipfile
import zlib

from build_designer_review import ReviewError, build, redact_local_paths, safe_member

DRIVE_PATH = "D:" + "/personal/"
USER_PATH = "C:" + "\\Users\\name\\private.json"
UNIX_PATH = "/" + "home/name/private.json"


def png(color=255):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    header = struct.pack(">IIBBBBB", 80, 50, 8, 6, 0, 0, 0)
    pixels = (b"\0" + bytes([color, 255, 255, 255]) * 80) * 50
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


class DesignerReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.inputs = self.root / "selected"
        self.inputs.mkdir()
        self.skill = self.root / "review-skill"
        self.skill.mkdir()
        (self.skill / "SKILL.md").write_text("---\nname: review-skill\ndescription: Review fixture.\n---\n# Rule\n", encoding="utf-8")
        (self.skill / ".env").write_text("not included", encoding="utf-8")
        entries = []
        for number in range(1, 13):
            key = f"{number:03}"
            current = self.inputs / "cases" / key
            before = self.inputs / "baseline" / key
            current.mkdir(parents=True)
            before.mkdir(parents=True)
            image = png()
            changed = number <= 5
            (current / "diagram.png").write_bytes(png(240) if changed else image)
            (before / "diagram.png").write_bytes(image)
            svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50" viewBox="0 0 80 50"><text x="4" y="30">图稿</text></svg>'
            (current / "diagram.svg").write_text(svg, encoding="utf-8")
            (before / "diagram.svg").write_text(svg, encoding="utf-8")
            (current / "checks.json").write_text(json.dumps({"passed": True, "localFile": DRIVE_PATH + "private/art.svg", "sourceHashes": {DRIVE_PATH + "one.svg": "abc", DRIVE_PATH + "two.svg": "def"}, "sourceUrl": "https://example.org/source"}), encoding="utf-8")
            ref = self.inputs / "references" / (key + ".png")
            ref.parent.mkdir(exist_ok=True)
            ref.write_bytes(image)
            entries.append({"number": key, "title": "图稿 " + key, "image": f"cases/{key}/diagram.png", "svg": f"cases/{key}/diagram.svg", "before": f"baseline/{key}/diagram.png", "stage": "改稿待评审" if changed else "未改，待评审", "changedImage": changed, "reference": {"file": f"references/{key}.png", "url": "https://example.org/reference/" + key, "title": "参考 " + key, "sha256": hashlib.sha256(image).hexdigest()}})
        self.selection = self.inputs / "selection.json"
        self.payload = {"cases": entries}
        self.selection.write_text(json.dumps(self.payload, ensure_ascii=False), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_offline_package_excludes_references_redacts_records_and_hashes_every_file(self):
        output = self.root / "designer-review-20261014-default"
        result = build(self.selection, output, skill_sources=[self.skill])
        page = (output / "index.html").read_text(encoding="utf-8")
        self.assertEqual(page.count('class="case"'), 12)
        self.assertEqual(page.count('data-changed="false"'), 7)
        self.assertEqual(page.count('data-changed="true"'), 5)
        self.assertNotIn("fetch(", page)
        self.assertIn("https://example.org/reference/001", page)
        self.assertFalse(any(output.rglob("original.png")))
        self.assertFalse(any(output.rglob(".env")))
        record = json.loads((output / "cases/001/records/checks.json").read_text(encoding="utf-8"))
        self.assertEqual(record["localFile"], "[本机路径已省略]")
        self.assertEqual(record["sourceUrl"], "https://example.org/source")
        self.assertEqual(len(record["sourceHashes"]), 2)
        self.assertEqual(set(record["sourceHashes"].values()), {"abc", "def"})
        self.assertNotIn(DRIVE_PATH, json.dumps(record))
        packaged_selection = json.loads((output / "selection.json").read_text(encoding="utf-8"))
        for entry in packaged_selection["cases"]:
            for field in ("image", "svg", "drawio", "before"):
                if entry.get(field):
                    self.assertTrue((output / entry[field]).is_file())
            for report in entry["checkFiles"]:
                self.assertTrue((output / report).is_file())
        manifest = json.loads(result["inventory"].read_text(encoding="utf-8"))
        files = {p.relative_to(output).as_posix() for p in output.rglob("*") if p.is_file()}
        self.assertEqual(files, {row["path"] for row in manifest["files"]})
        for row in manifest["files"]:
            self.assertEqual(row["sha256"], hashlib.sha256((output / row["path"]).read_bytes()).hexdigest())
            self.assertTrue(row["stage"])
        self.assertEqual(result["archive"].parent, output.parent)
        with zipfile.ZipFile(result["archive"]) as archive:
            self.assertEqual(set(archive.namelist()), files)
        self.assertFalse(manifest["summary"]["allCasesApproved"])
        self.assertEqual(manifest["summary"]["unchangedImages"], 7)
        self.assertEqual(manifest["summary"]["revisedImages"], 5)

    def test_private_references_require_explicit_flag_and_are_marked_internal(self):
        output = self.root / "designer-review-20261014-private"
        result = build(self.selection, output, private_references=True, skill_sources=[self.skill])
        self.assertEqual(len(list(output.rglob("original.png"))), 12)
        page = (output / "index.html").read_text(encoding="utf-8")
        self.assertIn("内部审阅版", page)
        self.assertIn("请勿公开发布或转发", page)
        manifest = json.loads(result["inventory"].read_text(encoding="utf-8"))
        self.assertEqual(sum(row["role"] == "private-reference-image" for row in manifest["files"]), 12)

    def test_path_escape_and_absolute_paths_are_rejected_even_for_omitted_references(self):
        for raw in ("../outside.png", "/tmp/outside.png", DRIVE_PATH + "outside.png", "D:outside.png", "file:///tmp/outside.png", "\\\\server\\share\\outside.png", "cases/001/diagram.png:stream"):
            with self.subTest(raw=raw), self.assertRaises(ReviewError):
                safe_member(self.inputs, raw, required=False)
        self.payload["cases"][0]["reference"]["file"] = "../outside.png"
        self.selection.write_text(json.dumps(self.payload), encoding="utf-8")
        output = self.root / "designer-review-20261014-escape"
        with self.assertRaises(ReviewError):
            build(self.selection, output, skill_sources=[self.skill])
        self.assertFalse(output.exists())

    def test_symlink_or_windows_junction_components_are_rejected(self):
        link = self.inputs / "linked"
        try:
            link.symlink_to(self.inputs / "cases", target_is_directory=True)
        except (OSError, NotImplementedError):
            if os.name != "nt":
                self.skipTest("This host cannot create a symlink fixture")
            try:
                import _winapi
                _winapi.CreateJunction(str(self.inputs / "cases"), str(link))
            except (AttributeError, OSError):
                self.skipTest("This host cannot create a symlink or junction fixture")
        with self.assertRaises(ReviewError):
            safe_member(self.inputs, "linked/001/diagram.png")

    def test_credentials_in_explicit_skill_sources_are_rejected(self):
        script = self.skill / "leak.py"
        script.write_text("credential = 'sk-" + "a" * 24 + "'", encoding="utf-8")
        with self.assertRaises(ReviewError):
            build(self.selection, self.root / "designer-review-20261014-secret", skill_sources=[self.skill])

    def test_existing_output_is_not_overwritten_and_source_urls_remain_intact(self):
        output = self.root / "designer-review-20261014-frozen"
        output.mkdir()
        marker = output / "user.txt"
        marker.write_text("preserve", encoding="utf-8")
        with self.assertRaises(ReviewError):
            build(self.selection, output, skill_sources=[self.skill])
        self.assertEqual(marker.read_text(encoding="utf-8"), "preserve")
        value = redact_local_paths({"nested": [USER_PATH, UNIX_PATH, "https://example.org/home/source"]})
        self.assertEqual(value["nested"][:2], ["[本机路径已省略]", "[本机路径已省略]"])
        self.assertEqual(value["nested"][2], "https://example.org/home/source")

    def test_unsafe_artwork_and_reference_urls_fail_before_output_is_created(self):
        svg = self.inputs / "cases/001/diagram.svg"
        svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50"><script>alert(1)</script></svg>', encoding="utf-8")
        output = self.root / "unsafe-svg"
        with self.assertRaises(ValueError):
            build(self.selection, output, skill_sources=[self.skill])
        self.assertFalse(output.exists())
        svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50"/>', encoding="utf-8")
        self.payload["cases"][0]["reference"]["url"] = "javascript:alert(1)"
        self.selection.write_text(json.dumps(self.payload), encoding="utf-8")
        with self.assertRaises(ReviewError):
            build(self.selection, output, skill_sources=[self.skill])
        self.assertFalse(output.exists())

    def test_duplicate_case_and_html_injection_do_not_silently_overwrite_or_execute(self):
        self.payload["cases"][0]["title"] = '</script><img src=x onerror="alert(1)">'
        self.selection.write_text(json.dumps(self.payload), encoding="utf-8")
        output = self.root / "escaped-html"
        build(self.selection, output, skill_sources=[self.skill])
        page = (output / "index.html").read_text(encoding="utf-8")
        self.assertNotIn('<img src=x onerror="alert(1)">', page)
        self.assertIn('&lt;/script&gt;&lt;img', page)
        self.payload["cases"][1]["number"] = "001"
        self.selection.write_text(json.dumps(self.payload), encoding="utf-8")
        output = self.root / "duplicate-case"
        with self.assertRaises(ReviewError):
            build(self.selection, output, skill_sources=[self.skill])
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
