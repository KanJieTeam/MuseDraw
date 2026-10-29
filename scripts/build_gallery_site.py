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
from gallery_catalog import gallery_catalog, gallery_prompts

PAGE_FILES = ("index.html", "gallery.css", "gallery.mjs", "styles.json", "previews.json")
CASE_FILES = ("scene.json", "prompt.md", "diagram.svg", "preview.jpg", "checks.json")
DOWNLOAD_FILES = ("downloads/musedraw-skill.zip", "downloads/musedraw-skill.json")
VISUAL_CASE_FILES = ("scene.json", "diagram.svg", "source.svg", "original.png", "preview.jpg", "prompt.md", "design.md", "author-notes.md", "source-meta.json")
VISUAL_CASE_DOWNLOADS = ("downloads/musedraw-visual-cases.zip", "downloads/musedraw-visual-cases.json")


def visual_case_files(root):
    """Return only declared, portable resources from the optional complete collection."""
    source = Path(root) / "gallery/collections/visual-cases"
    if not source.exists():
        return {}
    if source.is_symlink():
        raise ValueError("Refusing a linked visual collection")
    catalog = json.loads((source / "catalog.json").read_text(encoding="utf-8"))
    items = catalog["items"]
    if not items or len({item["id"] for item in items}) != len(items) or catalog["count"] != len(items):
        raise ValueError("Expected distinct declared visual cases")
    files = {name: source / name for name in ("catalog.json", "index.html", "selection.json", "static-checks.json")}
    for item in items:
        case_id = item["id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", case_id) or item["path"] != case_id:
            raise ValueError("Expected a contained visual case ID")
        folder = source / case_id
        if folder.is_symlink() or not folder.resolve().is_relative_to(source.resolve()):
            raise ValueError("Refusing a linked visual case")
        files.update({f"{case_id}/{name}": folder / name for name in VISUAL_CASE_FILES})
    for file in files.values():
        if file.is_symlink() or not file.is_file() or not file.resolve().is_relative_to(source.resolve()):
            raise ValueError("Refusing a missing or linked visual resource")
    return files


def build_visual_case_collection(root, staging):
    files = visual_case_files(root)
    if not files:
        return
    for relative, source in files.items():
        target = staging / "collections/visual-cases" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    archive = staging / VISUAL_CASE_DOWNLOADS[0]
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for relative, source in sorted(files.items()):
            info = zipfile.ZipInfo("visual-cases/" + relative, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, source.read_bytes())
    data = archive.read_bytes()
    count = json.loads(files["catalog.json"].read_text(encoding="utf-8"))["count"]
    (staging / VISUAL_CASE_DOWNLOADS[1]).write_text(json.dumps({"archive": archive.name, "caseCount": count, "files": len(files), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}, indent=2) + "\n", encoding="utf-8")


def build_skill_download(root, staging):
    """Ship the self-contained Skill, without gallery history or local runtime."""
    source = root / "skills/musedraw"
    if source.is_symlink() or not source.is_dir():
        raise ValueError("Expected a local MuseDraw Skill directory")
    files = {name: source / name for name in ("SKILL.md", "package.json", "package-lock.json")}
    for folder in ("agents", "scripts", "references", "themes", "assets", "tests/frontend-focus", "tests/ui-capture", "tests/open-channel"):
        if (source / folder).is_symlink():
            raise ValueError("Refusing a linked Skill resource directory")
        for directory, names, filenames in os.walk(source / folder, followlinks=False):
            names[:] = sorted(name for name in names if name not in {"node_modules", "output", "__pycache__", ".git"})
            for name in names + filenames:
                if (Path(directory) / name).is_symlink():
                    raise ValueError("Refusing a linked Skill resource")
            for name in filenames:
                file = Path(directory) / name
                design_preview = file.name == "preview.jpg" and file.is_relative_to(source / "assets/design-examples")
                frontend_example = file.suffix == ".html" and file.is_relative_to(source / "assets/frontend")
                composed_example = (
                    any(file.is_relative_to(source / "assets" / family)
                        for family in ("report-spreads", "visual-language"))
                    and file.suffix in {".html", ".css", ".png", ".jpg", ".svg", ".txt"}
                )
                if file.suffix in {".md", ".json", ".mjs", ".js", ".py", ".yaml"} or name.endswith("LICENSE") or design_preview or frontend_example or composed_example:
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
    if not items or len({item["slug"] for item in items}) != len(items):
        raise ValueError("Expected a nonempty catalog of unique current cases")
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
        (staging / "gallery/catalog.json").write_text(json.dumps(gallery_catalog(root), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (staging / "gallery/prompts.json").write_text(json.dumps(gallery_prompts(root), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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
        build_visual_case_collection(root, staging)
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
