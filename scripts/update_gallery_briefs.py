"""Separate natural user briefs from production specs; preserve all diagram assets.

Run with one or more JSON files containing [{id, prompt}, ...]. Without inputs,
sync from the public cases' prompt.txt files. Only text metadata is rewritten.
"""
import argparse
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / "docs" / "gallery"
REFERENCES = ROOT / "skills" / "musedraw" / "references"


def validate_brief(prompt):
    if not isinstance(prompt, str) or not 30 <= len(prompt.strip()) <= 180:
        raise ValueError("User briefs must be 30–180 characters, not production specs")
    if re.search(r"#[0-9a-fA-F]{6}\b|\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d|\d+\s*[×x]\s*\d+|精确色值|全部节点与|全部父域与", prompt):
        raise ValueError("Production coordinates, canvas sizes and hex palettes do not belong in user briefs")
    if "musedraw" not in prompt.lower() or "通用" not in prompt:
        raise ValueError("Published example briefs must name MuseDraw and mark their generic scope")
    return prompt.strip()


def reference_card(item, design, svg):
    geometry = design["geometry"]
    groups = [{k: g[k] for k in ("id", "title", "parent") if k in g} for g in geometry.get("groups", [])]
    nodes = [{k: n[k] for k in ("id", "label", "parent") if k in n} for n in geometry.get("nodes", [])]
    relations = [{k: p[k] for k in ("from", "to", "label") if k in p} for p in geometry.get("paths", [])]
    # Colors and canvas are designer hints, never required user input.
    ET.fromstring(svg)
    colors = list(dict.fromkeys(re.findall(r"#[0-9a-fA-F]{6}\b", svg)))
    return {
        "id": item["id"], "number": item["number"], "title": item["title"],
        "view": item["view"], "scope": "original-generic-reference",
        "design": {"composition": item["family"], "colorDirection": item["theme"],
                   "canvasHint": [item["width"], item["height"]], "palette": colors},
        "exampleContent": {"groups": groups, "nodes": nodes, "relations": relations},
        "previewUrl": f'https://kanjieteam.github.io/MuseDraw/docs/gallery/cases/{item["number"]}/diagram.png',
        "license": design["license"], "author": design["author"],
    }


def build_payloads(root, briefs):
    gallery = root / "docs" / "gallery"
    refs = root / "skills" / "musedraw" / "references"
    manifest = json.loads((gallery / "manifest.json").read_text(encoding="utf-8"))
    ids = {item["id"] for item in manifest["items"]}
    if len(manifest["items"]) != 100 or ids != set(range(1, 101)) or set(briefs) != ids:
        raise ValueError("Exactly one brief for each of the 100 published cases is required")
    payloads, index = {}, []
    for item in manifest["items"]:
        prompt = validate_brief(briefs[item["id"]])
        directory = gallery / "cases" / item["number"]
        design = json.loads((directory / "design.json").read_text(encoding="utf-8"))
        if design["id"] != item["id"] or design["title"] != item["title"]:
            raise ValueError("Case design/manifest identity differs")
        if "productionBrief" not in design:
            design["productionBrief"] = design["prompt"]
        design["prompt"] = prompt
        design["reference"] = f'cases/{item["number"]}/design.json'
        item["prompt"] = prompt
        item["reference"] = design["reference"]
        card = reference_card(item, design, (directory / "diagram.svg").read_text(encoding="utf-8"))
        topics = list(dict.fromkeys(g["title"] for g in card["exampleContent"]["groups"]))
        index.append({"id": item["id"], "number": item["number"], "title": item["title"],
                      "view": item["view"], "composition": item["family"], "theme": item["theme"],
                      "topics": topics, "resource": f'cases/{item["number"]}.json'})
        payloads[directory / "prompt.txt"] = prompt + "\n"
        payloads[directory / "design.json"] = json.dumps(design, ensure_ascii=False, indent=2) + "\n"
        payloads[refs / "cases" / f'{item["number"]}.json'] = json.dumps(card, ensure_ascii=False, indent=2) + "\n"
    manifest["version"] = 2
    payloads[gallery / "manifest.json"] = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n"
    payloads[refs / "gallery-index.json"] = json.dumps({"version": 1, "purpose": "optional-design-references-not-a-capability-allowlist", "items": index}, ensure_ascii=False, indent=2) + "\n"
    return payloads


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="*", type=Path)
    args = parser.parse_args()
    briefs = {}
    if args.inputs:
        for source in args.inputs:
            for row in json.loads(source.read_text(encoding="utf-8")):
                identifier = row["id"]
                if type(identifier) is not int or identifier in briefs:
                    raise ValueError("Duplicate or invalid case id")
                briefs[identifier] = row["prompt"]
    else:
        for directory in sorted((GALLERY / "cases").iterdir()):
            if re.fullmatch(r"\d{3}", directory.name):
                briefs[int(directory.name)] = (directory / "prompt.txt").read_text(encoding="utf-8").strip()
    # Validate every input and build the full plan before writing any file.
    payloads = build_payloads(ROOT, briefs)
    for destination, text in payloads.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
    sizes = [len(prompt) for prompt in briefs.values()]
    print(json.dumps({"cases": len(briefs), "briefCharacters": {"min": min(sizes), "max": max(sizes)},
                      "rewrittenMetadataFiles": len(payloads), "diagramAssetsModified": 0}, ensure_ascii=False))


if __name__ == "__main__":
    main()
