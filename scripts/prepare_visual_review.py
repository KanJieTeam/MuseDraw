"""Freeze an equal-size PNG pair for source-hidden review; never score the work."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import re

from check import png_dimensions


def digest(data):
    return hashlib.sha256(data).hexdigest()


def prepare(config, destination):
    """Config: brief text and two {id, images: {view-name: PNG path}} candidates.

    Only review/ goes to the reviewer. key.json contains the private mapping.
    Sources are read once before writing; images are never rescaled or renamed
    using an arm's identity. The caller must inspect visible identity leakage.
    """
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError(f"Evidence round already exists: {destination}")
    candidates = config.get("candidates", [])
    if len(candidates) != 2 or len({c.get("id") for c in candidates}) != 2:
        raise ValueError("Exactly two distinctly identified candidates are required")
    if not isinstance(config.get("brief"), str) or not config["brief"].strip():
        raise ValueError("The actual brief is required")
    views = set(candidates[0].get("images", {}))
    if not views or views != set(candidates[1].get("images", {})):
        raise ValueError("Both candidates must supply the same nonempty view set")
    if any(not re.fullmatch(r"[a-z][a-z0-9-]{0,40}", view) for view in views):
        raise ValueError("Use simple view names, not paths")
    full_views = set(config.get("fullPageViews", []))
    if not full_views.issubset(views):
        raise ValueError("Full-page view names must exist in both candidates")
    prepared, dimensions = [], {}
    for candidate in candidates:
        images = {}
        for view, filename in candidate["images"].items():
            source = Path(filename).resolve(strict=True)
            data = source.read_bytes()
            size = png_dimensions(data)
            if view in dimensions:
                prior = dimensions[view]
                if prior[0] != size[0] or (view not in full_views and prior != size):
                    raise ValueError(f"Unequal image dimensions for {view}")
            dimensions[view] = size
            images[view] = {"source": str(source), "data": data, "sha256": digest(data), "dimensions": size}
        prepared.append({"id": candidate["id"], "images": images})
    random.SystemRandom().shuffle(prepared)
    destination.mkdir()  # Existing rounds are immutable, even if currently empty.
    packet = destination / "review"
    packet.mkdir()
    files = {}
    brief = config["brief"].encode("utf-8")
    (packet / "brief.txt").write_bytes(brief)
    files["brief.txt"] = digest(brief)
    key = {"version": 1, "mapping": {}}
    for label, candidate in zip(("A", "B"), prepared):
        (packet / label).mkdir()
        records = {}
        for view, image in sorted(candidate["images"].items()):
            name = f"{label}/{view}.png"
            (packet / name).write_bytes(image["data"])
            files[name] = image["sha256"]
            records[view] = {k: v for k, v in image.items() if k != "data"}
        key["mapping"][label] = {"id": candidate["id"], "images": records}
    manifest = {"version": 1, "files": files,
                "viewDimensions": {label: {view: image["dimensions"] for view, image in candidate["images"].items()} for label, candidate in zip(("A", "B"), prepared)},
                "fullPageViews": sorted(full_views),
                "scope": "Evidence only. Source-hidden model preference is not human preference or proof of general quality."}
    (packet / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (destination / "key.json").write_text(json.dumps(key, indent=2) + "\n", encoding="utf-8")
    return packet


def verify(packet):
    packet = Path(packet)
    manifest = json.loads((packet / "manifest.json").read_text(encoding="utf-8"))
    failures = []
    for name, expected in manifest["files"].items():
        file = (packet / name).resolve()
        if not file.is_relative_to(packet.resolve()):
            raise ValueError("Evidence path escapes the packet")
        if not file.is_file() or digest(file.read_bytes()) != expected:
            failures.append(name)
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--config", type=Path)
    group.add_argument("--verify", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.verify:
        failures = verify(args.verify)
        print(json.dumps({"changedOrMissing": failures}))
        return int(bool(failures))
    if not args.out:
        parser.error("--config requires --out NEW_ROUND_DIRECTORY")
    print(prepare(json.loads(args.config.read_text(encoding="utf-8")), args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
