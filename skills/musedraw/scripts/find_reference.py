"""Optional local design-reference search; no match never blocks a drawing task.

Only a few candidates are emitted. --id reads one design card; --include-content
adds that generic example's modules only when the caller explicitly needs them.
"""
import argparse
import collections
import json
import math
from pathlib import Path
import re
import sys

REFERENCES = Path(__file__).resolve().parents[1] / "references"
STOP = {"架构", "构图", "绘图", "画图", "通用", "参考", "一张", "帮我", "给我", "专业", "简洁", "方案", "用于", "展示", "介绍"}


def terms(text):
    text = text.lower().replace("musedraw", "")
    chinese = re.findall(r"[\u4e00-\u9fff]+", text)
    parts = {word for chunk in chinese for word in (chunk[i:i + 2] for i in range(len(chunk) - 1)) if word not in STOP}
    return parts | set(re.findall(r"[a-z][a-z0-9_-]{1,}", text))


def search(items, query, limit=3):
    requested = terms(query)
    documents = [terms(item["title"] + " " + " ".join(item["topics"])) for item in items]
    frequency = collections.Counter(term for doc in documents for term in doc)
    matches = []
    for item, doc in zip(items, documents):
        shared = requested & doc
        if len(shared) < 2:
            continue
        score = sum(1 + math.log((len(items) + 1) / (frequency[term] + 1)) for term in shared)
        score += sum(1.5 for term in shared if term in terms(item["title"]))
        matches.append({"id": item["id"], "number": item["number"], "title": item["title"],
                        "view": item["view"], "composition": item["composition"], "theme": item["theme"],
                        "resource": item["resource"], "score": round(score, 3)})
    return sorted(matches, key=lambda match: (-match["score"], match["id"]))[:limit]


def design_card(identifier, include_content=False):
    if not 1 <= identifier <= 100:
        raise ValueError("Reference id must identify an existing published case")
    card = json.loads((REFERENCES / "cases" / f"{identifier:03}.json").read_text(encoding="utf-8"))
    if not include_content:
        card.pop("exampleContent", None)
    card["usage"] = "Optional inspiration only. Design for the user's content; this case is not a required template or evidence about their system."
    return card


def main():
    # Emit portable JSON even when Windows uses a legacy redirected encoding.
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", default="")
    parser.add_argument("--id", type=int)
    parser.add_argument("--limit", type=int, default=3, choices=range(1, 6))
    parser.add_argument("--include-content", action="store_true")
    args = parser.parse_args()
    if args.id is not None:
        result = design_card(args.id, args.include_content)
    else:
        if args.include_content:
            parser.error("--include-content requires an explicit --id")
        index = json.loads((REFERENCES / "gallery-index.json").read_text(encoding="utf-8"))
        candidates = search(index["items"], args.query, args.limit)
        result = {"matches": candidates, "fallback": "Create an original composition using the view and visual guides; the gallery is not a capability boundary."}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
