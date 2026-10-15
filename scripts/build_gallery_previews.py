"""Regenerate checked-in list thumbnails (maintainers: Pillow==12.3.0)."""
import hashlib
import io
import json
from pathlib import Path
import re


def build_previews(root):
    from PIL import Image
    root = Path(root).resolve()
    output = root / "assets/gallery/previews"
    if output.is_symlink():
        raise ValueError("Refusing a linked thumbnail directory")
    output.mkdir(exist_ok=True)
    catalog = json.loads((root / "gallery/catalog.json").read_text(encoding="utf-8"))
    index = {"version": 1, "items": {}, "sourceBytes": 0, "thumbnailBytes": 0}
    for item in catalog["items"]:
        slug = item["slug"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("Expected a portable case slug")
        source = root / "gallery" / slug / "preview.jpg"
        original = source.read_bytes()
        with Image.open(io.BytesIO(original)) as image:
            width, height = image.size
            image = image.convert("RGB")
            image.thumbnail((640, 480), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, "WEBP", quality=75, method=6)
            data = buffer.getvalue()
            thumbnail_width, thumbnail_height = image.size
        digest = hashlib.sha256(data).hexdigest()
        filename = f"{slug}-{digest[:12]}.webp"
        (output / filename).write_bytes(data)
        index["items"][slug] = {"thumbnail": "previews/" + filename,
            "width": width, "height": height,
            "thumbnailWidth": thumbnail_width, "thumbnailHeight": thumbnail_height,
            "bytes": len(data), "sha256": digest,
            "sourceSha256": hashlib.sha256(original).hexdigest()}
        index["sourceBytes"] += len(original)
        index["thumbnailBytes"] += len(data)
    expected = {Path(item["thumbnail"]).name for item in index["items"].values()}
    for file in output.glob("*.webp"):
        if re.fullmatch(r"[a-z0-9-]+-[a-f0-9]{12}\.webp", file.name) and file.name not in expected:
            if file.is_symlink() or file.resolve().parent != output.resolve():
                raise ValueError("Refusing an unexpected stale thumbnail")
            file.unlink()
    (root / "assets/gallery/previews.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"cases": len(index["items"]), "sourceBytes": index["sourceBytes"],
            "thumbnailBytes": index["thumbnailBytes"]}


if __name__ == "__main__":
    print(json.dumps(build_previews(Path(__file__).resolve().parents[1])))
