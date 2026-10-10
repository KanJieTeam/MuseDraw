#!/usr/bin/env python3
"""Offline artifact checks and existing regressions; not semantic or visual certification."""
import argparse
import html
import math
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import unittest
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zlib
from html.parser import HTMLParser

IGNORED = {".git", "__pycache__", ".venv", "venv", "node_modules", "output", "dist", "build", ".pytest_cache"}
TEXT_SUFFIXES = {".md", ".svg", ".json", ".yml", ".yaml", ".txt", ".py", ".mjs"}
SVG_NS = "http://www.w3.org/2000/svg"
MAX_SIDE = 8000  # Matches the current previewer's documented canvas limit.
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class CheckError(ValueError):
    pass


def project_files(root):
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED and not Path(directory, d).is_symlink())
        for name in sorted(files):
            path = Path(directory, name)
            if path.is_symlink():
                continue
            yield path


def check_skill(text, directory_name):
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0] != "---":
        raise CheckError("installable Skill requires frontmatter")
    try:
        end = lines.index("---", 1)
    except ValueError as error:
        raise CheckError("unclosed Skill frontmatter") from error
    fields = {}
    for index, line in enumerate(lines[1:end], 1):
        match = re.match(r"^(name|description):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        if key in fields:
            raise CheckError(f"duplicate frontmatter {key}")
        if value in {">", "|", ">-", "|-"}:
            following = []
            for item in lines[index + 1:end]:
                if item and not item[0].isspace():
                    break
                following.append(item.strip())
            value = " ".join(following)
        fields[key] = value.strip().strip("\"'").strip()
    if fields.get("name") != directory_name:
        raise CheckError("Skill name must match its parent directory")
    if not fields.get("description"):
        raise CheckError("Skill description must be nonempty")


def local_name(name):
    return name.rsplit("}", 1)[-1].lower()


def svg_dimensions(text):
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.I):
        raise CheckError("SVG DTD/entity declarations are not allowed")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        raise CheckError(f"invalid SVG XML: {error}") from error
    if root.tag != f"{{{SVG_NS}}}svg":
        raise CheckError("SVG requires the standard SVG namespace")
    try:
        box = [float(value) for value in re.split(r"[\s,]+", root.attrib["viewBox"].strip())]
    except (KeyError, ValueError) as error:
        raise CheckError("SVG requires a numeric viewBox") from error
    if len(box) != 4 or not all(math.isfinite(value) for value in box):
        raise CheckError("viewBox must contain four finite numbers")
    x, y, width, height = box
    if not (0 < width <= MAX_SIDE and 0 < height <= MAX_SIDE and max(abs(x), abs(y), abs(x + width), abs(y + height)) <= MAX_SIDE):
        raise CheckError("viewBox is outside bounded canvas limits")
    for key, expected in (("width", width), ("height", height)):
        if key not in root.attrib:
            continue
        try:
            actual = float(root.attrib[key].removesuffix("px"))
        except ValueError as error:
            raise CheckError("SVG width/height must be numeric pixels") from error
        if not math.isfinite(actual) or not math.isclose(actual, expected):
            raise CheckError("SVG pixel dimensions must match viewBox extents")
    ids, references = set(), []
    for element in root.iter():
        tag = local_name(element.tag)
        if tag in {"script", "foreignobject"}:
            raise CheckError(f"unsafe SVG element: {tag}")
        if tag in {"animate", "animatetransform", "animatemotion", "set"}:
            raise CheckError("dynamic SVG elements are not supported in static architecture artifacts")
        identifier = element.attrib.get("id")
        if identifier is not None:
            if not identifier or identifier in ids:
                raise CheckError("SVG ids must be nonempty and unique")
            ids.add(identifier)
        values = []
        for key, value in element.attrib.items():
            attribute = local_name(key)
            if attribute.startswith("on"):
                raise CheckError("SVG event handlers are not allowed")
            if key == "{http://www.w3.org/XML/1998/namespace}base":
                raise CheckError("SVG xml:base references are not allowed")
            if attribute in {"href", "src"}:
                if not value.startswith("#") or len(value) == 1:
                    raise CheckError("SVG external references are not allowed")
                references.append(value[1:])
            if attribute == "style" and "\\" in value:
                raise CheckError("escaped SVG CSS is not supported by the offline safety check")
            values.append(value)
        if tag == "style":
            css = "".join(element.itertext())
            if "\\" in css:
                raise CheckError("escaped SVG CSS is not supported by the offline safety check")
            values.append(css)
        for value in values:
            value = re.sub(r"/\*.*?\*/", "", value, flags=re.S)
            if re.search(r"@import\b|expression\s*\(|javascript\s*:", value, re.I):
                raise CheckError("unsafe SVG style/reference")
            for reference in re.findall(r"url\s*\(([^)]*)\)", value, re.I):
                reference = reference.strip().strip("\"'")
                if not reference.startswith("#") or len(reference) == 1:
                    raise CheckError("SVG external URL references are not allowed")
                references.append(reference[1:])
    if any(reference not in ids for reference in references):
        raise CheckError("SVG fragment reference has no matching id")
    return math.ceil(width), math.ceil(height)


def png_dimensions(data):
    if len(data) < 45 or data[:8] != PNG_SIGNATURE or data[8:16] != b"\x00\x00\x00\rIHDR":
        raise CheckError("invalid PNG signature/IHDR")
    if zlib.crc32(data[12:29]) != struct.unpack(">I", data[29:33])[0]:
        raise CheckError("invalid PNG IHDR checksum")
    if data[-12:] != b"\x00\x00\x00\x00IEND\xaeB`\x82":
        raise CheckError("PNG is truncated or lacks IEND")
    width, height = struct.unpack(">II", data[16:24])
    if not (0 < width <= MAX_SIDE and 0 < height <= MAX_SIDE):
        raise CheckError("PNG dimensions are outside bounded canvas limits")
    return width, height


class HtmlTargets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and ((tag == "a" and key == "href") or (tag in {"img", "source"} and key == "src")):
                self.targets.append(value)


def markdown_targets(text):
    # Code examples are not rendered links. Sensitive-content checks still scan them.
    text = re.sub(r"(?ms)^\s*(```|~~~).*?^\s*\1[^\n]*$", "", text)
    inline = re.findall(r"!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+[^)]+)?\)", text)
    definitions = {key.strip().casefold(): value for key, value in re.findall(r"(?m)^\s*\[([^\]\n]+)\]:\s*(<[^>\n]+>|\S+)", text)}
    for label, reference in re.findall(r"!?\[([^\]\n]+)\]\[([^\]\n]*)\]", text):
        key = (reference or label).strip().casefold()
        if key not in definitions:
            raise CheckError(f"undefined Markdown reference: {key}")
    parser = HtmlTargets()
    parser.feed(text)
    return inline + list(definitions.values()) + parser.targets


def check_markdown(text, path, root):
    errors = []
    for raw in markdown_targets(text):
        target = html.unescape(raw.strip("<>"))
        if re.match(r"^[A-Za-z]:[\\/]", target) or target.startswith("file:"):
            errors.append("absolute filesystem link is not portable")
            continue
        parts = urlsplit(target)
        if parts.scheme in {"http", "https", "mailto", "tel"} or parts.netloc:
            continue  # Offline: never fetch external URLs.
        if parts.scheme:
            errors.append(f"unsupported link scheme: {parts.scheme}")
            continue
        decoded = unquote(parts.path)
        if not decoded:
            continue  # Heading anchors are not semantically checked.
        candidate = (root / decoded.lstrip("/") if decoded.startswith("/") else path.parent / decoded).resolve()
        if not candidate.is_relative_to(root.resolve()):
            errors.append(f"local link escapes repository: {raw}")
        elif not candidate.exists():
            errors.append(f"missing local link/resource: {raw}")
    return errors


def sensitive_content(text):
    problems = []
    # Narrow, recognizable disclosures; this is not a comprehensive secret scanner.
    if re.search(r"\b[A-Za-z]:[\\/]|/(?:Users|home)/[^/\s]+/", text):
        problems.append("personal/absolute machine path must be replaced with a portable path")
    tokens = r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b"
    if re.search(tokens, text) or re.search(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----", text):
        problems.append("obvious credential/private-key pattern")
    assignment = r"\b(?:api[_-]?key|access[_-]?token|secret(?:[_-]?key)?|password)\s*[=:]\s*[\"']([^\"'\r\n]{12,})[\"']"
    for value in re.findall(assignment, text, re.I):
        if not re.search(r"example|sample|dummy|placeholder|changeme|redacted|your|replace|[<$\s]", value, re.I):
            problems.append("literal credential assignment")
            break
    # Do not ban the legitimate Codex product/client name, only branch commands.
    command = r"\bgit\s+(?:switch\s+-c|checkout\s+-b|branch(?:\s+-[mM])?)\s+([^\n`]+)"
    for arguments in re.findall(command, text, re.I):
        if any("codex" in token.casefold() for token in re.findall(r"[\w./-]+", arguments)):
            problems.append("branch creation/rename command uses the prohibited branch name")
            break
    return problems


def inspect_repository(root):
    root = root.resolve()
    errors, dimensions = [], {}
    files = list(project_files(root))
    for path in files:
        relative = path.relative_to(root)
        try:
            if path.suffix in TEXT_SUFFIXES:
                text = path.read_text(encoding="utf-8-sig")
                errors.extend(f"{relative}: {message}" for message in sensitive_content(text))
                if path.suffix == ".md":
                    errors.extend(f"{relative}: {message}" for message in check_markdown(text, path, root))
                if relative.parts[:1] == ("skills",) and len(relative.parts) == 3 and path.name == "SKILL.md":
                    check_skill(text, path.parent.name)
                if path.suffix == ".svg":
                    dimensions[path] = svg_dimensions(text)
        except (CheckError, UnicodeError, OSError, ValueError) as error:
            errors.append(f"{relative}: {error}")
    for path in files:
        if path.suffix != ".png":
            continue
        try:
            size = png_dimensions(path.read_bytes())
            peer = path.with_suffix(".svg")
            if peer in dimensions and size != dimensions[peer]:
                raise CheckError(f"PNG size {size} differs from SVG {dimensions[peer]}")
            if path.relative_to(root).parts[:1] == ("examples",) and not peer.is_file():
                raise CheckError("example PNG requires a matching native SVG")
        except (CheckError, OSError) as error:
            errors.append(f"{path.relative_to(root)}: {error}")
    for case in sorted((root / "examples").glob("*")):
        if case.is_dir() and case.name not in IGNORED:
            for required in ("brief.md", "diagram.svg", "diagram.png", "review.md"):
                if not (case / required).is_file():
                    errors.append(f"{case.relative_to(root)}: missing {required}")
    return errors


def run_python_tests(root):
    suite = unittest.TestSuite()
    for folder, pattern in ((root / "scripts", "test_*.py"), (root / "skills/musedraw/scripts", "test_renderer.py")):
        suite.addTests(unittest.TestLoader().discover(str(folder), pattern=pattern))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(f"Python tests: {result.testsRun} run, {len(result.skipped)} skipped; failures={len(result.failures)}, errors={len(result.errors)}")
    return result.wasSuccessful()


def run_node_checks(root, playwright=None, browser=None):
    node = shutil.which("node")
    if not node:
        print("SKIP Node syntax and browser preview: Node is unavailable.")
        return not playwright
    modules = [path for path in project_files(root) if path.suffix == ".mjs"]
    for module in modules:
        result = subprocess.run([node, "--check", str(module)], capture_output=True, text=True, timeout=30)
        if result.returncode:
            print(result.stderr or result.stdout, file=sys.stderr)
            return False
    print(f"PASS Node syntax: {len(modules)} modules (not browser layout tests).")
    if not playwright:
        print("SKIP browser layout/security fixtures: opt in with --playwright MODULE [--browser EXECUTABLE].")
        return True
    command = [node, str(root / "skills/musedraw/scripts/test_preview.mjs"), "--playwright", str(Path(playwright).resolve())]
    if browser:
        command += ["--browser", str(Path(browser).resolve())]
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    print(result.stdout, end="")
    if result.returncode:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--playwright", help="optional existing Playwright module; no automatic install")
    parser.add_argument("--browser", help="optional existing browser executable for browser fixtures")
    args = parser.parse_args()
    if args.browser and not args.playwright:
        parser.error("--browser requires --playwright")
    root = Path(__file__).resolve().parents[1]
    errors = inspect_repository(root)
    for error in errors:
        print(f"FAIL {error}", file=sys.stderr)
    if not errors:
        print("PASS offline links, Skill metadata, safe SVG, PNG headers/dimensions and obvious disclosure checks.")
    python_ok = run_python_tests(root)
    try:
        node_ok = run_node_checks(root, args.playwright, args.browser)
    except (OSError, subprocess.TimeoutExpired) as error:
        print(f"FAIL Node/browser invocation: {error}", file=sys.stderr)
        node_ok = False
    print("Not checked offline: remote URLs/heading anchors, full PNG decoding, rendered typography/layout, architecture semantics, visual quality or source licensing.")
    return int(bool(errors) or not python_ok or not node_ok)


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    raise SystemExit(main())
