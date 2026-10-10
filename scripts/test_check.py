"""Positive and deliberately broken fixtures for offline checks; no browser dependency."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from check import (CheckError, PNG_SIGNATURE, check_markdown, check_skill,
                   inspect_repository, markdown_targets, png_dimensions,
                   sensitive_content, svg_dimensions)


def svg(body="", attributes='viewBox="0 0 100 50" width="100" height="50"'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" {attributes}>{body}</svg>'


def png(width=100, height=50):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    pixels = (b"\0" + b"\xff\xff\xff\xff" * width) * height
    return PNG_SIGNATURE + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


class SvgTests(unittest.TestCase):
    def test_safe_native_svg_and_local_fragment(self):
        body = '<defs><marker id="arrow"/></defs><path marker-end="url(#arrow)"/><text>&lt;script&gt; &amp; https://example.org</text>'
        self.assertEqual(svg_dimensions(svg(body)), (100, 50))

    def test_scripts_rejected(self):
        with self.assertRaisesRegex(CheckError, "unsafe SVG element"):
            svg_dimensions(svg('<script>alert(1)</script>'))

    def test_event_handlers_rejected(self):
        for attribute in ('onload="alert(1)"', 'ONCLICK="alert(1)"'):
            with self.subTest(attribute=attribute), self.assertRaisesRegex(CheckError, "event handlers"):
                svg_dimensions(svg(f'<rect {attribute}/>'))

    def test_foreign_objects_rejected(self):
        with self.assertRaisesRegex(CheckError, "unsafe SVG element"):
            svg_dimensions(svg('<foreignObject><div/></foreignObject>'))

    def test_external_href_src_and_xlink_rejected(self):
        for reference in ("https://example.org/a.svg", "data:image/png;base64,AAA", "other.svg", "file:/tmp/a"):
            for attribute in ("href", "src", "xlink:href"):
                body = f'<image xmlns:xlink="http://www.w3.org/1999/xlink" {attribute}="{reference}"/>'
                with self.subTest(reference=reference, attribute=attribute), self.assertRaisesRegex(CheckError, "external references"):
                    svg_dimensions(svg(body))

    def test_external_css_and_import_rejected(self):
        for body in ('<rect style="fill:url(https://example.org/a)"/>', '<style>@import "remote.css";</style>', '<rect style="fill:expression(alert(1))"/>'):
            with self.subTest(body=body), self.assertRaises(CheckError):
                svg_dimensions(svg(body))

    def test_local_css_reference_is_allowed(self):
        self.assertEqual(svg_dimensions(svg('<defs><linearGradient id="paint"/></defs><style>rect{fill:url("#paint")}</style><rect/>')), (100, 50))

    def test_escaped_css_cannot_hide_external_resources(self):
        for body in ('<style>rect{fill:u\\72l(https://example.org/a)}</style>', '<rect style="fill:u\\72l(https://example.org/a)"/>'):
            with self.subTest(body=body), self.assertRaisesRegex(CheckError, "escaped SVG CSS"):
                svg_dimensions(svg(body))

    def test_css_comments_cannot_hide_import(self):
        with self.assertRaisesRegex(CheckError, "unsafe SVG style"):
            svg_dimensions(svg('<style>@im/**/port "remote.css";</style>'))

    def test_dynamic_svg_cannot_change_reference_after_validation(self):
        for tag in ("set", "animate", "animateTransform", "animateMotion"):
            with self.subTest(tag=tag), self.assertRaisesRegex(CheckError, "dynamic SVG"):
                svg_dimensions(svg(f'<{tag} attributeName="href" to="https://example.org/asset"/>'))

    def test_xml_base_rejected(self):
        with self.assertRaisesRegex(CheckError, "xml:base"):
            svg_dimensions(svg('<g xml:base="https://example.org/"><use href="#item"/></g><rect id="item"/>'))

    def test_duplicate_and_empty_ids_rejected(self):
        for body in ('<rect id="same"/><text id="same"/>', '<rect id=""/>'):
            with self.subTest(body=body), self.assertRaisesRegex(CheckError, "unique"):
                svg_dimensions(svg(body))

    def test_missing_internal_reference_rejected(self):
        with self.assertRaisesRegex(CheckError, "matching id"):
            svg_dimensions(svg('<path marker-end="url(#absent)"/>'))

    def test_viewbox_missing_nonfinite_or_unbounded_rejected(self):
        for attributes in ('', 'viewBox="0 0 NaN 50"', 'viewBox="0 0 inf 50"', 'viewBox="0 0 0 50"', 'viewBox="0 0 -1 50"', 'viewBox="0 0 9000 50"', 'viewBox="99999 0 100 50"', 'viewBox="0 0 100"'):
            with self.subTest(attributes=attributes), self.assertRaises(CheckError):
                svg_dimensions(svg(attributes=attributes))

    def test_pixel_dimensions_must_match(self):
        for width in ("101", "100%", "NaN"):
            with self.subTest(width=width), self.assertRaises(CheckError):
                svg_dimensions(svg(attributes=f'viewBox="0 0 100 50" width="{width}"'))

    def test_entities_namespace_and_invalid_xml_rejected(self):
        for content in ('<!DOCTYPE svg [<!ENTITY x "boom">]>' + svg('<text>&x;</text>'), '<svg viewBox="0 0 100 50"/>', svg()[:-6]):
            with self.subTest(content=content), self.assertRaises(CheckError):
                svg_dimensions(content)


class PngTests(unittest.TestCase):
    def test_real_png_header_dimensions(self):
        self.assertEqual(png_dimensions(png()), (100, 50))

    def test_bad_signature_truncation_or_checksum_rejected(self):
        data = png()
        changed = bytearray(data)
        changed[20] ^= 1
        for broken in (b"not-a-png", b"JPEGxxxx" + data[8:], data[:-12], bytes(changed)):
            with self.subTest(size=len(broken)), self.assertRaises(CheckError):
                png_dimensions(broken)

    def test_nonpositive_and_oversized_png_rejected(self):
        for width in (0, 8001):
            with self.subTest(width=width), self.assertRaises(CheckError):
                png_dimensions(png(width, 1))


class MetadataTests(unittest.TestCase):
    def test_matching_skill_name_and_description(self):
        check_skill('---\nname: musedraw\ndescription: "Native software architecture diagrams"\n---\n# Skill', "musedraw")
        check_skill('---\nname: musedraw\ndescription: >\n  Native diagrams\n  with readable labels\n---', "musedraw")

    def test_frontmatter_negative_cases(self):
        for text in ('# Navigation only', '---\nname: musedraw', '---\nname: another\ndescription: valid\n---', '---\nname: musedraw\ndescription: ""\n---', '---\nname: musedraw\ndescription: >\n---', '---\nname: musedraw\nname: musedraw\ndescription: valid\n---'):
            with self.subTest(text=text), self.assertRaises(CheckError):
                check_skill(text, "musedraw")


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def test_markdown_relative_reference_html_percent_and_external_links(self):
        self.write("docs/space name.md", "# File")
        path = self.write("README.md", "")
        content = '[file](<docs/space name.md>) ![img][pic]\n[pic]: docs/space%20name.md\n<a href="docs/space%20name.md">file</a> [remote](https://nonexistent.invalid/file) [heading](#heading)'
        self.assertEqual(check_markdown(content, path, self.root), [])

    def test_missing_markdown_resources_rejected(self):
        path = self.write("README.md", "")
        for content in ('[x](missing.md)', '![x][pic]\n[pic]: missing.png', '<img src="missing.png">'):
            with self.subTest(content=content):
                self.assertTrue(check_markdown(content, path, self.root))

    def test_undefined_reference_rejected(self):
        with self.assertRaisesRegex(CheckError, "undefined"):
            markdown_targets('[x][absent]')

    def test_fenced_link_examples_are_not_real_links(self):
        path = self.write("README.md", "")
        self.assertEqual(check_markdown('```markdown\n[x](not-a-file.md)\n```', path, self.root), [])

    def test_absolute_links_and_repository_escape_rejected(self):
        path = self.write("docs/guide.md", "")
        for target in ("../../outside.md", "file:///tmp/asset.svg", "Q:" + "/personal/asset.svg", "%2e%2e/%2e%2e/outside.md"):
            with self.subTest(target=target):
                self.assertTrue(check_markdown(f'[x]({target})', path, self.root))

    def test_root_navigation_needs_no_frontmatter(self):
        self.write("SKILL.md", "# Installable package\n[Skill](skills/musedraw/SKILL.md)")
        self.write("skills/musedraw/SKILL.md", "---\nname: musedraw\ndescription: Native diagrams\n---")
        self.assertEqual(inspect_repository(self.root), [])

    def test_png_svg_mismatch_and_missing_companion_rejected(self):
        self.write("examples/demo/brief.md", "Generic reference")
        self.write("examples/demo/review.md", "Manual checks recorded")
        self.write("examples/demo/diagram.svg", svg())
        (self.root / "examples/demo/diagram.png").write_bytes(png(99, 50))
        self.assertTrue(any("differs from SVG" in item for item in inspect_repository(self.root)))
        (self.root / "examples/demo/review.md").unlink()
        self.assertTrue(any("missing review.md" in item for item in inspect_repository(self.root)))

    def test_generated_and_cache_directories_excluded(self):
        self.write("output/broken.svg", "not XML")
        self.write("node_modules/sample/README.md", "[bad](missing.md)")
        self.write("__pycache__/bad.md", "[bad](missing.md)")
        self.assertEqual(inspect_repository(self.root), [])


class DisclosureTests(unittest.TestCase):
    def test_portable_paths_and_codex_client_are_allowed(self):
        self.assertEqual(sensitive_content("Use the Codex client with ~/.codex/skills. https://example.org/skills is documentation."), [])
        self.assertEqual(sensitive_content('api_key = "YOUR_API_KEY_PLACEHOLDER"'), [])

    def test_machine_paths_are_rejected(self):
        for value in ("Q:" + "/private/work.svg", "/" + "home/realuser/private/work.svg", "/" + "Users/realuser/work.svg"):
            with self.subTest(value=value):
                self.assertTrue(sensitive_content(value))

    def test_obvious_credentials_are_rejected(self):
        examples = ["ghp_" + "A" * 36, "AKIA" + "B" * 16, "sk-" + "C" * 30,
                    "-----BEGIN " + "PRIVATE KEY-----", 'password = "' + "a9B7z3H0opaqueSecret" + '"']
        for value in examples:
            with self.subTest(kind=value[:4]):
                self.assertTrue(sensitive_content(value))

    def test_prohibited_branch_commands_rejected_without_banning_product(self):
        for prefix in ("git switch -c ", "git checkout -b ", "git branch -m old "):
            with self.subTest(prefix=prefix):
                self.assertTrue(sensitive_content(prefix + "co" + "dex/feature"))
        self.assertEqual(sensitive_content("git switch -c feat/native-diagram"), [])


if __name__ == "__main__":
    unittest.main()
