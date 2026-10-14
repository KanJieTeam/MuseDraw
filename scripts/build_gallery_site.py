"""Build the public style page from an explicit allowlist, replacing stale output."""
import json
import argparse
import re
from pathlib import Path
import shutil
import tempfile

PAGE_FILES = ("index.html", "gallery.css", "gallery.mjs", "manifest.json", "README.md")
EXAMPLE_FILES = ("document.json", "diagram.svg", "diagram.png", "preview-1200.png")
STYLE_IDS = ("sketch", "planes")


def build_site(root, output_name="site"):
    root = Path(root).resolve()
    gallery = root / "docs" / "gallery"
    manifest = json.loads((gallery / "manifest.json").read_text(encoding="utf-8"))
    if [item["id"] for item in manifest["items"]] != list(STYLE_IDS):
        raise ValueError("The public page must contain the two current styles")
    output = root / "output"
    if output.is_symlink():
        raise ValueError("Refusing a symlinked output directory")
    output.mkdir(exist_ok=True)
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", output_name):
        raise ValueError("Use a contained generated site directory name")
    destination = output / output_name
    if destination.is_symlink() or destination.resolve() != root / "output" / output_name:
        raise ValueError("Refusing an unexpected generated site destination")
    staging = Path(tempfile.mkdtemp(prefix="site-build-", dir=output))
    try:
        public = staging / "docs" / "gallery"
        public.mkdir(parents=True)
        for filename in PAGE_FILES:
            shutil.copyfile(gallery / filename, public / filename)
        for identifier in STYLE_IDS:
            source = gallery / "examples" / identifier
            target = public / "examples" / identifier
            target.mkdir(parents=True)
            for filename in EXAMPLE_FILES:
                shutil.copyfile(source / filename, target / filename)
        shutil.copytree(root / "assets" / "brand", staging / "assets" / "brand")
        (staging / "index.html").write_text(
            '<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta http-equiv="refresh" content="0;url=docs/gallery/">'
            '<title>MuseDraw 风格样例</title><a href="docs/gallery/">打开 MuseDraw 风格样例</a></html>\n',
            encoding="utf-8",
        )
        (staging / ".nojekyll").touch()
        # This fixed, generated directory is replaced only after staging succeeds.
        if destination.exists():
            shutil.rmtree(destination)
        staging.replace(destination)
    finally:
        if staging.exists():
            if staging.parent.resolve() != output.resolve() or not staging.name.startswith("site-build-"):
                raise ValueError("Refusing an unexpected staging cleanup target")
            shutil.rmtree(staging)
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-name", default="site", help="Named child of output; default matches Pages upload")
    args = parser.parse_args()
    build_site(Path(__file__).resolve().parents[1], args.output_name)
    print("Public style page artifact ready: output/" + args.output_name)
