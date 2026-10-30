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
from unittest import mock
import xml.etree.ElementTree as ET
from urllib.parse import unquote
import zlib
import zipfile

from build_gallery_site import build_site, CASE_FILES, PAGE_FILES, DOWNLOAD_FILES, build_skill_download, visual_case_files, VISUAL_CASE_DOWNLOADS
from check import svg_dimensions, check_markdown
from gallery_catalog import gallery_catalog, gallery_prompts, gallery_source

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
            self.assertEqual(text.count(f'href="{url}"'), 1, "Keep only the top textual gallery entry")
            self.assertNotIn("打开在线图库", text)
            self.assertNotIn("Explore the live gallery", text)
            self.assertNotIn('href="gallery/README.md"', text)
        styles = json.loads((ROOT / "assets/gallery/styles.json").read_text(encoding="utf-8"))
        self.assertEqual(set(styles), {item["theme"] for item in self.items})
        for key, style in styles.items():
            theme = json.loads((ROOT / "skills/musedraw/themes" / f"{key}.json").read_text(encoding="utf-8"))
            self.assertEqual(style["name"], theme["nameZh"])
            self.assertTrue(style["swatches"])
            for color in style["swatches"]:
                self.assertRegex(color, r"^#[0-9a-fA-F]{3,8}$")

    def test_gallery_defaults_to_all_and_has_a_reachable_request_template(self):
        html = (ROOT / "assets/gallery/index.html").read_text(encoding="utf-8")
        self.assertRegex(html, r'data-collection="all"[^>]*aria-pressed="true"')
        collection = re.search(r'<select id="collection">(.*?)</select>', html).group(1)
        self.assertTrue(collection.startswith('<option value="all">'))
        for element_id in ("request-top", "request-style", "request-empty"):
            self.assertIn(f'id="{element_id}"', html)
        template = (ROOT / ".github/ISSUE_TEMPLATE/style-request.md").read_text(encoding="utf-8")
        for heading in ("想画什么", "希望是什么样子", "What would you like to draw", "保密"):
            self.assertIn(heading, template)

    def test_current_catalog_and_original_artwork(self):
        self.assertEqual(len(self.items), 120)
        self.assertEqual(len({item["slug"] for item in self.items}), 120)
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
            self.assertEqual(json.loads(result.stdout)["rendered"], 120)
            self.assertEqual(len(list(Path(scratch).glob("*.svg"))), 120)
            for file in Path(scratch).glob("*.svg"):
                svg_dimensions(file.read_text(encoding="utf-8"))

    def test_pages_contains_only_current_artwork_and_replaces_stale_output(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-v3-site-") as scratch:
            root = Path(scratch)
            shutil.copytree(ROOT / "gallery", root / "gallery")
            shutil.copytree(ROOT / "assets/gallery", root / "assets/gallery")
            shutil.copytree(ROOT / "assets/brand", root / "assets/brand")
            shutil.copytree(ROOT / "skills/musedraw", root / "skills/musedraw", ignore=shutil.ignore_patterns("node_modules", "output", "__pycache__"))
            shutil.copyfile(ROOT / "LICENSE", root / "LICENSE")
            if (ROOT / "NOTICE").is_file():
                shutil.copyfile(ROOT / "NOTICE", root / "NOTICE")
            stale = root / "output/site/docs/gallery/cases/001"
            stale.mkdir(parents=True)
            (stale / "obsolete.svg").touch()
            historical = root / "gallery/cases/002"
            historical.mkdir(parents=True)
            (historical / "old.svg").touch()
            original_replace = Path.replace
            locked_attempts = []

            def transient_scanner_lock(source, destination):
                if source.name.startswith("site-build-") and len(locked_attempts) < 2:
                    locked_attempts.append(source)
                    raise PermissionError("Temporary scanner lock")
                return original_replace(source, destination)

            with mock.patch.object(Path, "replace", transient_scanner_lock), mock.patch("build_gallery_site.time.sleep") as sleep:
                site = build_site(root)
            self.assertGreaterEqual(sleep.call_count, 2)
            html = (site / "index.html").read_text(encoding="utf-8")
            self.assertEqual(json.loads((site / "gallery/catalog.json").read_text(encoding="utf-8")), gallery_catalog(root))
            self.assertEqual(json.loads((site / "gallery/prompts.json").read_text(encoding="utf-8")), gallery_prompts(root))
            for filename in ("gallery.css", "gallery.mjs"):
                version = hashlib.sha256((site / filename).read_bytes()).hexdigest()[:12]
                self.assertIn(f'"{filename}?v={version}"', html)
            expected = set(PAGE_FILES) | set(DOWNLOAD_FILES) | {".nojekyll", "gallery/catalog.json", "gallery/prompts.json", "docs/gallery/index.html"}
            collection = visual_case_files(root)
            if collection:
                expected |= {"collections/visual-cases/" + relative for relative in collection}
                expected |= set(VISUAL_CASE_DOWNLOADS)
            expected |= {f'{item["path"]}/{filename}' for item in self.items for filename in CASE_FILES}
            expected |= {file.relative_to(root / "assets/gallery").as_posix() for file in (root / "assets/gallery/previews").glob("*.webp")}
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

    def test_small_previews_match_current_sources_and_have_a_bounded_payload(self):
        index = json.loads((ROOT / "assets/gallery/previews.json").read_text(encoding="utf-8"))
        all_items = gallery_catalog(ROOT)["items"]
        self.assertEqual(len(all_items), 300)
        self.assertEqual(set(index["items"]), {item["slug"] for item in all_items})
        total = source_total = 0
        expected = set()
        for item in all_items:
            data = index["items"][item["slug"]]
            relative = data["thumbnail"]
            self.assertRegex(relative, rf'^previews/{re.escape(item["slug"])}-[a-f0-9]{{12}}\.webp$')
            expected.add(Path(relative).name)
            content = (ROOT / "assets/gallery" / relative).read_bytes()
            source = (gallery_source(ROOT, item) / "preview.jpg").read_bytes()
            self.assertEqual(hashlib.sha256(source).hexdigest(), data["sourceSha256"], "Run build_gallery_previews.py after changing a gallery preview")
            self.assertEqual(hashlib.sha256(content).hexdigest(), data["sha256"])
            self.assertEqual(len(content), data["bytes"])
            self.assertEqual(content[:4], b"RIFF")
            self.assertEqual(content[8:12], b"WEBP")
            self.assertEqual(int.from_bytes(content[4:8], "little") + 8, len(content))
            self.assertTrue(0 < data["thumbnailWidth"] <= 640 and 0 < data["thumbnailHeight"] <= 480)
            total += len(content)
            source_total += len(source)
        self.assertEqual(expected, {file.name for file in (ROOT / "assets/gallery/previews").glob("*.webp")})
        self.assertEqual(total, index["thumbnailBytes"])
        self.assertEqual(source_total, index["sourceBytes"])
        self.assertLess(total, source_total * 0.15)

    def test_readme_collage_keeps_selected_cases_and_twenty_styles_in_one_image(self):
        from build_readme_showcase import CASES, FEATURED
        selected = ["05-mvp-whiteboard", "06-kafka-riso", "38-good-lesson-chalkboard",
                    "03-gitops-terminal", "08-ai-agent-aurora", "17-onboarding-90-pastel",
                    "20-customer-journey-terracotta", "42-gtd-whiteboard", "41-run-of-show-swiss"]
        self.assertEqual(FEATURED, selected)
        self.assertEqual(CASES[:9], selected)
        self.assertEqual(len(CASES), 24)
        self.assertEqual(len(set(CASES)), 24)
        self.assertEqual(len({case["theme"] for case in self.items if case["slug"] in CASES}), 20)
        manifest = json.loads((ROOT / "assets/gallery/readme-showcase.json").read_text())
        self.assertEqual(manifest["featured"], selected)
        self.assertEqual((manifest["width"], manifest["height"]), (1920, 1080))
        self.assertEqual(manifest["layout"], "scattered-overlap")
        self.assertEqual([case["slug"] for case in manifest["cases"]], CASES)
        for case in manifest["cases"]:
            source = (ROOT / "gallery" / case["slug"] / "preview.jpg").read_bytes()
            self.assertEqual(hashlib.sha256(source).hexdigest(), case["sourceSha256"])
        image = (ROOT / "assets/gallery/readme-showcase.jpg").read_bytes()
        self.assertEqual(len(image), manifest["bytes"])
        self.assertLess(len(image), 1024 * 1024)
        self.assertEqual(hashlib.sha256(image).hexdigest(), manifest["sha256"])
        for filename in ("README.md", "README.zh-CN.md", "README.en.md"):
            text = (ROOT / filename).read_text(encoding="utf-8")
            self.assertEqual(text.count("assets/gallery/readme-showcase.jpg"), 1)
            self.assertNotIn("flagship-grid.jpg", text)

    def test_skill_download_is_complete_reproducible_and_runtime_free(self):
        with tempfile.TemporaryDirectory(prefix="musedraw-download-") as scratch:
            staging = Path(scratch)
            build_skill_download(ROOT, staging)
            archive = staging / DOWNLOAD_FILES[0]
            first = archive.read_bytes()
            manifest = json.loads((staging / DOWNLOAD_FILES[1]).read_text())
            self.assertEqual(manifest["bytes"], len(first))
            self.assertEqual(manifest["sha256"], hashlib.sha256(first).hexdigest())
            # The complete starter artworks are shipped with their editable layouts.
            # Keep the archive bounded without dropping the assets those layouts use.
            # Keep complete original raster assets replayable, alongside cheap metadata search.
            self.assertLess(len(first), 32 * 1024 * 1024)
            with zipfile.ZipFile(archive) as bundle:
                names = bundle.namelist()
                self.assertEqual(len(names), manifest["files"])
                for required in ("SKILL.md", "LICENSE", "scripts/musedraw.mjs", "scripts/vendor/ROUGHJS-LICENSE", "assets/starters/rag.zh.json", "assets/starters/rag.en.json", "references/scene.schema.json", "references/frontend-design.md", "references/frontend-work-apps.md", "scripts/ui/focus-preservation.js", "tests/frontend-focus/focus.test.mjs"):
                    self.assertIn("musedraw/" + required, names)
                self.assertEqual(len([name for name in names if name.startswith("musedraw/themes/")]), 20)
                for required in ("references/frontend-composition.md", "scripts/capture-ui.mjs", "tests/ui-capture/capture.test.mjs", "assets/frontend/latch/index.html"):
                    self.assertIn("musedraw/" + required, names)
                self.assertFalse(any(set(Path(name).parts) & {"..", "node_modules", "output", ".git", "gallery"} for name in names))
                self.assertEqual(bundle.read("musedraw/SKILL.md"), (ROOT / "skills/musedraw/SKILL.md").read_bytes())
                for required in ("scripts/musecore.mjs", "scripts/musecore/runtime.mjs",
                                 "scripts/musecore/report-families.mjs", "scripts/musecore/svg.mjs",
                                 "references/musecore-runtime.md", "assets/musecore/index.json",
                                 "assets/musecore/flow.json", "assets/musecore/report.json",
                                 "tests/musecore/browser.test.mjs", "tests/musecore/visual.test.mjs",
                                 "scripts/musecore/visual-families.mjs", "scripts/musecore/data-visuals.mjs",
                                 "scripts/musecore/editorial.mjs", "assets/musecore/artwork/leaf-specimens.mjs",
                                 "assets/musecore/specimen.json", "assets/musecore/editorial-page.json",
                                 "references/musecore-visual-runtime.md", "references/musecore-spatial-data.md",
                                 "scripts/musecore/quantitative.mjs", "scripts/musecore/spatial-families.mjs",
                                 "scripts/musecore/comparison-families.mjs", "tests/musecore/spatial-data.test.mjs",
                                 "assets/musecore/constellation.json", "assets/musecore/cohort.json",
                                 "references/musecore-distributions.md", "scripts/musecore/distribution-families.mjs",
                                 "scripts/musecore/flow-amounts.mjs", "tests/musecore/distribution.test.mjs",
                                 "assets/musecore/histogram.json", "assets/musecore/sankey.json",
                                 "references/musecore-workflows.md", "scripts/musecore/graphs.mjs",
                                 "scripts/musecore/workflow-structures.mjs", "scripts/musecore/office-time.mjs",
                                 "scripts/musecore/time-windows.mjs", "scripts/musecore/collaboration.mjs",
                                 "scripts/musecore/calculation.mjs", "scripts/musecore/formula.mjs",
                                 "scripts/musecore/state-trace.mjs", "scripts/musecore/states.mjs",
                                 "scripts/musecore/deployment.mjs", "tests/musecore/workflows.test.mjs",
                                 "assets/musecore/planner.json", "assets/musecore/formula.json",
                                 "references/musecore-objects.md", "scripts/musecore/teaching-objects.mjs",
                                 "scripts/musecore/chalk-figures.mjs", "scripts/musecore/blueprint-figures.mjs",
                                 "scripts/musecore/magnitude.mjs", "scripts/musecore/solid-objects.mjs",
                                 "scripts/musecore/solid-figures.mjs", "tests/musecore/objects.test.mjs",
                                 "assets/musecore/lens.json", "assets/musecore/orthoview.json",
                                 "references/musecore-office-analysis.md", "scripts/musecore/office-analysis.mjs",
                                 "scripts/musecore/office-cost.mjs", "scripts/musecore/office-objectives.mjs",
                                 "scripts/musecore/office-audits.mjs", "tests/musecore/office-analysis.test.mjs",
                                 "assets/musecore/cost-allocation.json", "assets/musecore/meeting-audit.json",
                                 "references/musecore-systems.md", "scripts/musecore/system-models.mjs",
                                 "scripts/musecore/reliability-figures.mjs", "scripts/musecore/request-figures.mjs",
                                 "scripts/musecore/hash-figures.mjs", "tests/musecore/systems.test.mjs",
                                 "assets/musecore/token-bucket.json", "assets/musecore/hash-ring.json",
                                 "references/musecore-mathematics.md", "scripts/musecore/math-models.mjs",
                                 "scripts/musecore/math-shapes.mjs", "scripts/musecore/binary-figures.mjs",
                                 "scripts/musecore/probability-figures.mjs", "tests/musecore/mathematics.test.mjs",
                                 "assets/musecore/symmetry.json", "assets/musecore/dice-grid.json",
                                 "references/musecore-relations.md", "scripts/musecore/architecture-models.mjs",
                                 "scripts/musecore/architecture-figures.mjs", "tests/musecore/architecture.test.mjs",
                                 "scripts/musecore/sequence-models.mjs", "scripts/musecore/sequence-figures.mjs",
                                 "scripts/musecore/responsibility-models.mjs", "scripts/musecore/responsibility-figures.mjs",
                                 "scripts/musecore/backup-figures.mjs", "tests/musecore/sequence.test.mjs",
                                 "tests/musecore/responsibility.test.mjs", "assets/musecore/architecture.json",
                                 "assets/musecore/message-sequence.json", "assets/musecore/daci.json",
                                 "assets/musecore/backup-inventory.json",
                                 'references/musecore-execution.md',
                                 'references/musecore-workdays.md',
                                 'references/musecore-sky-geometry.md',
                                 'references/musecore-small-samples.md',
                                 'scripts/musecore/history-models.mjs',
                                 'scripts/musecore/history-figures.mjs',
                                 'scripts/musecore/loop-models.mjs',
                                 'scripts/musecore/loop-figures.mjs',
                                 'scripts/musecore/workforce-models.mjs',
                                 'scripts/musecore/workforce-figures.mjs',
                                 'scripts/musecore/leave-models.mjs',
                                 'scripts/musecore/leave-figures.mjs',
                                 'scripts/musecore/orbit-models.mjs',
                                 'scripts/musecore/orbit-figures.mjs',
                                 'scripts/musecore/phase-models.mjs',
                                 'scripts/musecore/phase-figures.mjs',
                                 'scripts/musecore/category-models.mjs',
                                 'scripts/musecore/category-figures.mjs',
                                 'scripts/musecore/sample-models.mjs',
                                 'scripts/musecore/sample-figures.mjs',
                                 'assets/musecore/git-history.json',
                                 'assets/musecore/loop-trace.json',
                                 'assets/musecore/workforce.json',
                                 'assets/musecore/leave-plan.json',
                                 'assets/musecore/orbital-motion.json',
                                 'assets/musecore/moon-phases.json',
                                 'assets/musecore/categorical-bars.json',
                                 'assets/musecore/sample-summary.json',
                                 'tests/musecore/history-loop.test.mjs',
                                 'tests/musecore/workforce-leave.test.mjs',
                                 'tests/musecore/orbit-phase.test.mjs',
                                 'tests/musecore/category-sample.test.mjs',
                                 'references/musecore-circuit-force.md',
                                 'references/musecore-algebra.md',
                                 'references/musecore-office-decisions.md',
                                 'scripts/musecore/priority-models.mjs',
                                 'scripts/musecore/priority-figures.mjs',
                                 'scripts/musecore/benefit-models.mjs',
                                 'scripts/musecore/benefit-figures.mjs',
                                 'scripts/musecore/circuit-models.mjs',
                                 'scripts/musecore/circuit-figures.mjs',
                                 'scripts/musecore/force-models.mjs',
                                 'scripts/musecore/force-figures.mjs',
                                 'scripts/musecore/equation-models.mjs',
                                 'scripts/musecore/equation-figures.mjs',
                                 'scripts/musecore/quantity-models.mjs',
                                 'scripts/musecore/quantity-figures.mjs',
                                 'assets/musecore/ohmic-circuit.json',
                                 'assets/musecore/force-motion.json',
                                 'assets/musecore/equation-balance.json',
                                 'assets/musecore/two-quantities.json',
                                 'assets/musecore/service-priority.json',
                                 'assets/musecore/benefit-wallet.json',
                                 'tests/musecore/priority-benefit.test.mjs',
                                 'tests/musecore/circuit-force.test.mjs',
                                 'tests/musecore/equation-quantity.test.mjs',
                                 'references/musecore-spacing-map.md',
                                 'references/musecore-approval-handoff.md',
                                 'references/musecore-terrain-response.md',
                                 'scripts/musecore/spacing-models.mjs',
                                 'scripts/musecore/spacing-figures.mjs',
                                 'scripts/musecore/map-models.mjs',
                                 'scripts/musecore/map-figures.mjs',
                                 'scripts/musecore/approval-models.mjs',
                                 'scripts/musecore/approval-figures.mjs',
                                 'scripts/musecore/handoff-models.mjs',
                                 'scripts/musecore/handoff-figures.mjs',
                                 'scripts/musecore/field-models.mjs',
                                 'scripts/musecore/field-figures.mjs',
                                 'scripts/musecore/runoff-models.mjs',
                                 'scripts/musecore/runoff-figures.mjs',
                                 'assets/musecore/interval-spacing.json',
                                 'assets/musecore/compass-map.json',
                                 'assets/musecore/approval-workflow.json',
                                 'assets/musecore/handoff-checklist.json',
                                 'assets/musecore/contour-field.json',
                                 'assets/musecore/runoff-response.json',
                                 'tests/musecore/spacing-map.test.mjs',
                                 'tests/musecore/approval-handoff.test.mjs',
                                 'tests/musecore/field-runoff.test.mjs'):
                    self.assertIn("musedraw/" + required, names)
                for relative in (
                    "assets/style-kits/marks.mjs",
                    "assets/style-kits/swiss.css",
                    "assets/style-kits/ink-wash.css",
                    "references/style-kits/swiss.md",
                    "references/style-kits/ink-wash.md",
                    "references/style-kit-api.md",
                    "scripts/style-kit.mjs",
                    "assets/visual-language/shared.css",
                    "assets/report-spreads/seed.css",
                    "assets/report-spreads/urban-block.png",
                    "assets/report-spreads/illustration-prompt.txt",
                    "assets/report-spreads/preview-urban.png",
                    "assets/report-spreads/preview-budget.png",
                ):
                    self.assertEqual(bundle.read("musedraw/" + relative),
                                     (ROOT / "skills/musedraw" / relative).read_bytes())
                for family in ("swiss", "riso", "ink-wash", "swiss-repair"):
                    for filename in ("index.html", "artwork.png", "preview.jpg", "prompt.md", "asset-prompt.txt"):
                        relative = f"assets/visual-language/{family}/{filename}"
                        self.assertEqual(bundle.read("musedraw/" + relative),
                                         (ROOT / "skills/musedraw" / relative).read_bytes())
                for family in ("riso-report", "ink-report"):
                    for filename in ("index.html", "report.css", "chart.png", "chart.svg", "data.json", "derived.json", "preview.jpg", "prompt.md"):
                        relative = f"assets/visual-language/{family}/{filename}"
                        self.assertEqual(bundle.read("musedraw/" + relative),
                                         (ROOT / "skills/musedraw" / relative).read_bytes())
                for family, plots in (("business", ("totals.png", "rates.png")),
                                      ("project", ("timeline.png", "work.png")),
                                      ("research", ("paired.png", "changes.png"))):
                    for filename in ("index.html", "study.css", "data.json", "derived.json", "preview.jpg", "prompt.md", *plots):
                        relative = f"assets/visual-language/office-{family}/{filename}"
                        self.assertEqual(bundle.read("musedraw/" + relative),
                                         (ROOT / "skills/musedraw" / relative).read_bytes())
                style_registry = json.loads(bundle.read("musedraw/assets/visual-language/index.json"))
                for item in style_registry["items"]:
                    for resource in item["files"]:
                        relative = "assets/visual-language/" + resource
                        self.assertEqual(bundle.read("musedraw/" + relative),
                                         (ROOT / "skills/musedraw" / relative).read_bytes())
                self.assertIn("musedraw/tests/style-library/browser.mjs", names)
                extracted = staging / "extracted"
                bundle.extractall(extracted)
                for reference in ("frontend-design.md", "frontend-work-apps.md", "frontend-composition.md"):
                    document = extracted / "musedraw/references" / reference
                    self.assertEqual(check_markdown(document.read_text(encoding="utf-8"), document, extracted / "musedraw"), [])

                design_root = "musedraw/assets/design-examples/scientific/"
                catalog = json.loads(bundle.read(design_root + "index.json"))
                for example in catalog["examples"]:
                    for key in ("scene", "method", "preview"):
                        self.assertIn(design_root + example[key], names)
                self.assertFalse(any("drawio" in name.lower() or "draw.io" in name.lower() for name in names))
                for name in names:
                    if name.lower().endswith((".md", ".yaml", ".json", ".mjs", ".js")):
                        self.assertNotRegex(bundle.read(name).decode("utf-8", "ignore"), r"draw\.?io")
            second = staging / "second"
            second.mkdir()
            build_skill_download(ROOT, second)
            self.assertEqual(first, (second / DOWNLOAD_FILES[0]).read_bytes())


if __name__ == "__main__":
    unittest.main()
