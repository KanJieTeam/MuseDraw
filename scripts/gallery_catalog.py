"""One public gallery, backed by the original scenes and author-supplied artwork."""
import json
from pathlib import Path

CATEGORIES = {"工程": "engineering", "科研": "research", "办公": "office", "教学": "teaching",
              "数据": "data", "数据图表与信息图": "data", "海报": "poster", "海报与活动视觉": "poster"}


def gallery_catalog(root):
    root = Path(root)
    original = json.loads((root / "gallery/catalog.json").read_text(encoding="utf-8"))
    source = root / "gallery/collections/visual-cases/catalog.json"
    additions = []
    if source.is_file():
        for case in json.loads(source.read_text(encoding="utf-8"))["items"]:
            folder = "collections/visual-cases/" + case["path"]
            additions.append({"id": "V-" + case["sourceId"], "slug": "visual-" + case["id"],
                              "title": case["title"], "subtitle": case["method"],
                              "category": CATEGORIES[case["category"]], "theme": case["theme"],
                              "status": "included", "path": folder, "repoPath": "gallery/" + folder,
                              "collection": "visual-cases", "nativeArtwork": True,
                              "advisory": case.get("advisory", ""), "lang": "zh"})
    items = additions + original["items"]
    if len({i["slug"] for i in items}) != len(items):
        raise ValueError("Gallery IDs must remain distinct across collections")
    summary = {}
    for item in items:
        counts = summary.setdefault(item["category"], {})
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    return {**original, "description": "MuseDraw gallery: original scenes and author-supplied visual cases in one collection.",
            "summary": summary, "items": items}


def gallery_prompts(root):
    root = Path(root)
    original = json.loads((root / "gallery/prompts.json").read_text(encoding="utf-8"))
    source = root / "gallery/collections/visual-cases/catalog.json"
    if source.is_file():
        for case in json.loads(source.read_text(encoding="utf-8"))["items"]:
            original["items"]["visual-" + case["id"]] = {"zh": case["brief"]}
    return original


def gallery_source(root, item):
    """Published paths omit the repository's gallery/ prefix for author artwork."""
    return Path(root) / item.get("repoPath", item["path"])
