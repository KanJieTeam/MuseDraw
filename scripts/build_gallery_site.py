"""Build Pages exclusively from the current catalog and original v3 artwork."""
import argparse
import json
from pathlib import Path
import re
import shutil
import tempfile

PAGE_FILES = ("index.html", "gallery.css", "gallery.mjs", "styles.json")
CASE_FILES = ("scene.json", "prompt.md", "diagram.svg", "preview.jpg", "checks.json", "diagram.drawio")


def build_site(root, output_name="site"):
    root = Path(root).resolve()
    catalog = json.loads((root / "gallery/catalog.json").read_text(encoding="utf-8"))
    items = catalog["items"]
    if len(items) != 100 or len({item["slug"] for item in items}) != 100:
        raise ValueError("Expected the 100 unique current catalog cases")
    output = root / "output"
    if output.is_symlink():
        raise ValueError("Refusing a linked output directory")
    output.mkdir(exist_ok=True)
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", output_name):
        raise ValueError("Use a contained generated site directory name")
    destination = output / output_name
    if destination.is_symlink() or destination.resolve() != output / output_name:
        raise ValueError("Refusing an unexpected generated site destination")
    staging = Path(tempfile.mkdtemp(prefix="site-build-", dir=output))
    try:
        for filename in PAGE_FILES:
            shutil.copyfile(root / "assets/gallery" / filename, staging / filename)
        (staging / "gallery").mkdir()
        shutil.copyfile(root / "gallery/catalog.json", staging / "gallery/catalog.json")
        shutil.copyfile(root / "gallery/prompts.json", staging / "gallery/prompts.json")
        for item in items:
            slug = item["slug"]
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or item["path"] != f"gallery/{slug}":
                raise ValueError("Expected a portable current gallery case path")
            source = root / "gallery" / slug
            if source.is_symlink() or not source.resolve().is_relative_to(root / "gallery"):
                raise ValueError("Refusing a linked gallery case")
            target = staging / "gallery" / slug
            target.mkdir()
            for filename in CASE_FILES:
                shutil.copyfile(source / filename, target / filename)
        shutil.copytree(root / "assets/brand", staging / "assets/brand")
        legacy = staging / "docs/gallery"
        legacy.mkdir(parents=True)
        (legacy / "index.html").write_text(
            '<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta http-equiv="refresh" content="0;url=../../">'
            '<link rel="canonical" href="../../"><title>MuseDraw 图库</title>'
            '<a href="../../">打开当前 MuseDraw 图库</a></html>\n', encoding="utf-8")
        (staging / ".nojekyll").touch()
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
    parser.add_argument("--output-name", default="site")
    args = parser.parse_args()
    build_site(Path(__file__).resolve().parents[1], args.output_name)
    print("Current gallery artifact ready: output/" + args.output_name)
