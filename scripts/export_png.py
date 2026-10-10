"""Render an SVG using existing local browser tools; never install dependencies."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

from check import svg_dimensions


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "skills" / "musedraw" / "scripts" / "preview.mjs"


def validate_source(source: Path) -> None:
    """Reject active or externally loaded SVG before discovering browser tools."""
    svg_dimensions(source.read_text(encoding="utf-8-sig"))


def discover_playwright(node: str, explicit: str | None = None) -> Path:
    supplied = explicit or os.environ.get("MUSEDRAW_PLAYWRIGHT")
    if supplied:
        candidate = Path(supplied).expanduser().resolve()
        if not candidate.is_file():
            raise ValueError("The supplied Playwright module does not exist.")
        return candidate
    probe = subprocess.run(
        [node, "-p", "require.resolve('playwright/package.json')"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    if probe.returncode == 0:
        package = Path(probe.stdout.strip()).parent
        for filename in ("index.mjs", "index.js"):
            candidate = package / filename
            if candidate.is_file():
                return candidate
    raise ValueError(
        "Playwright is not available locally. Use --playwright with an existing "
        "module, or optionally run npm install --no-save playwright in this "
        "checkout. No dependencies have been installed."
    )


def discover_browser(explicit: str | None = None) -> Path | None:
    supplied = explicit or os.environ.get("MUSEDRAW_BROWSER")
    if supplied:
        candidate = Path(supplied).expanduser().resolve()
        if not candidate.is_file():
            raise ValueError("The supplied browser executable does not exist.")
        return candidate
    for command in ("chromium", "chromium-browser", "google-chrome", "msedge"):
        executable = shutil.which(command)
        if executable:
            return Path(executable)
    candidates = [
        Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    ]
    for variable in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        base = os.environ.get(variable)
        if base:
            candidates.extend(
                [
                    Path(base) / "Google/Chrome/Application/chrome.exe",
                    Path(base) / "Microsoft/Edge/Application/msedge.exe",
                ]
            )
    return next((candidate for candidate in candidates if candidate.is_file()), None)


def build_command(
    node: str, source: Path, output: Path, module: Path, browser: Path | None
) -> list[str]:
    command = [node, str(PREVIEW), str(source), str(output), "--playwright", str(module)]
    if browser is not None:
        command.extend(["--browser", str(browser)])
    return command


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Source SVG")
    parser.add_argument("output", type=Path, help="Destination PNG")
    parser.add_argument("--playwright", help="Existing Playwright entry module")
    parser.add_argument("--browser", help="Existing Chrome/Edge/Chromium executable")
    args = parser.parse_args()
    source, output = args.input.resolve(), args.output.resolve()
    if not source.is_file() or source.suffix.lower() != ".svg":
        parser.error("Input must be an existing SVG file.")
    if output.suffix.lower() != ".png" or output == source:
        parser.error("Output must be a separate PNG file.")
    if output.exists() or Path(str(output) + ".checks.json").exists():
        parser.error("Output already exists; choose a new path to preserve earlier results.")
    try:
        validate_source(source)
    except (ValueError, UnicodeError, OSError) as error:
        parser.error(f"SVG validation failed: {error}")
    node = shutil.which("node")
    if node is None:
        parser.error("PNG export needs an existing Node.js installation.")
    try:
        module = discover_playwright(node, args.playwright)
        browser = discover_browser(args.browser)
        result = subprocess.run(build_command(node, source, output, module, browser), check=False)
        return result.returncode
    except (ValueError, subprocess.TimeoutExpired) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
