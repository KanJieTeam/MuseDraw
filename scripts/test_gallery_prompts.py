"""Check complete bilingual prompts without modifying original gallery briefs."""
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class GalleryPromptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "gallery/catalog.json").read_text(encoding="utf-8"))["items"]
        cls.document = json.loads((ROOT / "gallery/prompts.json").read_text(encoding="utf-8"))

    def test_exact_catalog_coverage_and_two_languages(self):
        self.assertEqual(self.document["version"], 1)
        self.assertEqual(len(self.catalog), 101)
        self.assertEqual(set(self.document["items"]), {item["slug"] for item in self.catalog})
        for item in self.catalog:
            with self.subTest(slug=item["slug"]):
                pair = self.document["items"][item["slug"]]
                self.assertEqual(set(pair), {"zh", "en"})
                for text in pair.values():
                    self.assertIsInstance(text, str)
                    self.assertGreater(len(text), 45)
                    self.assertEqual(text, text.strip())
                    self.assertIn("MuseDraw", text)

    def test_original_language_is_preserved_verbatim(self):
        for item in self.catalog:
            with self.subTest(slug=item["slug"]):
                markdown = (ROOT / item["path"] / "prompt.md").read_text(encoding="utf-8")
                match = re.search(r"(?:^|\n)>[ \t]+([^\n]+(?:\n>[ \t]+[^\n]+)*)", markdown)
                self.assertIsNotNone(match)
                original = re.sub(r"\n>[ \t]+", "\n", match.group(1)).strip()
                self.assertEqual(self.document["items"][item["slug"]][item["lang"]], original)

    def test_translations_are_complete_target_language_text(self):
        for item in self.catalog:
            with self.subTest(slug=item["slug"]):
                pair = self.document["items"][item["slug"]]
                self.assertRegex(pair["zh"], r"[\u4e00-\u9fff]")
                self.assertNotRegex(pair["en"], r"[\u4e00-\u9fff]")
                self.assertNotEqual(pair["zh"], pair["en"])
                if item["lang"] == "en":
                    self.assertFalse(pair["zh"].endswith(pair["en"]))
                else:
                    self.assertFalse(pair["en"].endswith(pair["zh"]))


if __name__ == "__main__":
    unittest.main()
