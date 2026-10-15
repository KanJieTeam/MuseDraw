"""Build Pages exclusively from the current catalog and original v3 artwork."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
import zipfile

PAGE_FILES = ("index.html", "gallery.css", "gallery.mjs", "styles.json", "previews.json")
CASE_FILES = ("scene.json", "prompt.md", "diagram.svg", "preview.jpg", "checks.json", "diagram.drawio")
DOWNLOAD_FILES = ("downloads/musedraw-skill.zip", "downloads/musedraw-skill.json")


def build_skill_download(root, staging):
    """Ship the self-contained Skill, without gallery history or local runtime."""
    source = root / "skills/musedraw"
    if source.is_symlink() or not source.is_dir():
        raise ValueError("Expected a local MuseDraw Skill directory")
    files = {name: source / name for name in ("SKILL.md", "package.json", "package-lock.json")}
    for folder in ("scripts", "references", "themes", "assets"):
        if (source / folder).is_symlink():
            raise ValueError("Refusing a linked Skill resource directory")
        for directory, names, filenames in os.walk(source / folder, followlinks=False):
            names[:] = sorted(name for name in names if name not in {"node_modules", "output", "__pycache__", ".git"})
            for name in names + filenames:
                if (Path(directory) / name).is_symlink():
                    raise ValueError("Refusing a linked Skill resource")
            for name in filenames:
                file = Path(directory) / name
                if file.suffix in {".md", ".json", ".mjs", ".js", ".py"} or name.endswith("LICENSE"):
                    files[file.relative_to(source).as_posix()] = file
    files["LICENSE"] = root / "LICENSE"
    if (root / "NOTICE").is_file():
        files["NOTICE"] = root / "NOTICE"
    destination = staging / "downloads"
    destination.mkdir()
    archive = destination / "musedraw-skill.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, file in sorted(files.items()):
            if file.is_symlink() or not file.resolve().is_relative_to(root):
                raise ValueError("Refusing a linked Skill file")
            info = zipfile.ZipInfo("musedraw/" + name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, file.read_bytes())
    data = archive.read_bytes()
    manifest = {"archive": "musedraw-skill.zip", "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(), "files": len(files),
                "skillVersion": json.loads(files["package.json"].read_text(encoding="utf-8"))["version"],
                "sourceCommit": os.environ.get("MUSEDRAW_SOURCE_COMMIT")}
    (destination / "musedraw-skill.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


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
        shutil.copytree(root / "assets/gallery/previews", staging / "previews")
        # Keep frequent gallery visitors from mixing a new page with yesterday's
        # cached stylesheet or module after a GitHub Pages deployment.
        html = (staging / "index.html").read_text(encoding="utf-8")
        for filename in ("gallery.css", "gallery.mjs"):
            version = hashlib.sha256((staging / filename).read_bytes()).hexdigest()[:12]
            html = html.replace(f'"{filename}"', f'"{filename}?v={version}"')
        (staging / "index.html").write_text(html, encoding="utf-8")
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
        build_skill_download(root, staging)
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
        for attempt in range(6):
            try:
                staging.replace(destination)
                break
            except PermissionError:
                # Virus scanners can briefly hold newly copied gallery files
                # on Windows. Never delete a destination to recover from this.
                if attempt == 5 or destination.exists():
                    raise
                time.sleep(0.15 * (attempt + 1))
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
