"""Behavioral checks for short briefs and optional, installed reference lookup."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sync = load("gallery_brief_sync", ROOT / "scripts" / "update_gallery_briefs.py")
finder = load("gallery_reference_finder", ROOT / "skills" / "musedraw" / "scripts" / "find_reference.py")


class GalleryBriefTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = json.loads((ROOT / "docs" / "gallery" / "manifest.json").read_text(encoding="utf-8"))["items"]
        cls.references = json.loads((ROOT / "skills" / "musedraw" / "references" / "gallery-index.json").read_text(encoding="utf-8"))["items"]

    def test_all_100_user_briefs_are_short_and_keep_specification_separate(self):
        self.assertEqual(len(self.items), 100)
        for item in self.items:
            brief = sync.validate_brief(item["prompt"])
            folder = ROOT / "docs" / "gallery" / "cases" / item["number"]
            self.assertEqual(brief, (folder / "prompt.txt").read_text(encoding="utf-8").strip())
            design = json.loads((folder / "design.json").read_text(encoding="utf-8"))
            self.assertEqual(design["prompt"], brief)
            self.assertGreater(len(design["productionBrief"]), len(brief))
            self.assertEqual(item["reference"], f'cases/{item["number"]}/design.json')

    def test_production_parameters_are_not_user_requirements(self):
        accepted = "用 MuseDraw 画一张客户互动营销的通用参考架构图，突出多渠道接入、活动、内容和消息服务，适合方案汇报。"
        self.assertEqual(sync.validate_brief(accepted), accepted)
        for extra in ("颜色#26394A", "尺寸2050×1800", "模块[50,150,1950,245]", "全部节点与坐标"):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                sync.validate_brief(accepted + extra)

    def test_each_case_has_an_installed_design_reference_without_coordinates(self):
        self.assertEqual({r["id"] for r in self.references}, set(range(1, 101)))
        for item in self.references:
            card = finder.design_card(item["id"])
            self.assertEqual(card["title"], item["title"])
            self.assertNotIn("exampleContent", card)
            self.assertNotIn("productionBrief", card)
            self.assertNotIn("geometry", card)
            self.assertTrue(card["design"]["composition"])

    def test_optional_search_does_not_force_an_unrelated_case(self):
        self.assertEqual(finder.search(self.references, "深海沉积物采样舱遥测", 3), [])
        self.assertEqual(finder.search(self.references, "", 3), [])
        hits = finder.search(self.references, "客户互动营销", 3)
        self.assertIn(97, [match["id"] for match in hits])
        self.assertLessEqual(len(hits), 3)

    def test_example_content_requires_an_explicit_opt_in(self):
        card = finder.design_card(97, include_content=True)
        labels = {node["label"] for node in card["exampleContent"]["nodes"]}
        self.assertIn("活动登记", labels)
        self.assertEqual(card["exampleContent"]["relations"], [])
        with self.assertRaises(ValueError):
            finder.design_card(101)

    def test_sync_plan_never_writes_graphic_assets_and_preserves_geometry(self):
        briefs = {item["id"]: item["prompt"] for item in self.items}
        payloads = sync.build_payloads(ROOT, briefs)
        self.assertFalse(any(path.suffix in {".svg", ".png", ".drawio"} for path in payloads))
        for item in self.items:
            path = ROOT / "docs" / "gallery" / item["reference"]
            before = json.loads(path.read_text(encoding="utf-8"))
            after = json.loads(payloads[path])
            self.assertEqual(after["geometry"], before["geometry"])
            self.assertEqual(after["productionBrief"], before["productionBrief"])
            self.assertEqual(after["inspiration"], before["inspiration"])

    def test_duplicate_or_incomplete_briefs_are_rejected_before_writes(self):
        with self.assertRaises(ValueError):
            sync.build_payloads(ROOT, {1: self.items[0]["prompt"]})

    def test_lookup_works_from_a_standalone_installed_skill(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-reference-test-") as scratch:
            installed = Path(scratch) / "musedraw"
            shutil.copytree(ROOT / "skills" / "musedraw", installed)
            command = [sys.executable, str(installed / "scripts" / "find_reference.py")]
            result = subprocess.run(command + ["客户互动营销"], cwd=scratch, capture_output=True, text=True, encoding="utf-8", check=True)
            self.assertIn(97, [match["id"] for match in json.loads(result.stdout)["matches"]])
            result = subprocess.run(command + ["--id", "97"], cwd=scratch, capture_output=True, text=True, encoding="utf-8", check=True)
            self.assertNotIn("exampleContent", json.loads(result.stdout))
            result = subprocess.run(command + ["深海沉积物采样舱遥测"], cwd=scratch, capture_output=True, text=True, encoding="utf-8", check=True)
            self.assertEqual(json.loads(result.stdout)["matches"], [])
            result = subprocess.run(command + ["--include-content"], cwd=scratch, capture_output=True, text=True, encoding="utf-8")
            self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
