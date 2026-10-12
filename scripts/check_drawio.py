#!/usr/bin/env python3
"""Strict native draw.io file checks; does not claim browser editing coverage."""
import argparse
import base64
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

def close(a, b):
    return abs(float(a) - float(b)) <= 0.00002

def check(case):
    svg = ET.parse(case / "diagram.svg").getroot()
    ns = "{http://www.w3.org/2000/svg}"
    metadata = json.loads(svg.find(ns + "metadata[@id='layout-metadata']").text)
    source_texts = ["\n".join("".join(s.itertext()) for s in el.findall(ns + "tspan"))
                    if el.findall(ns + "tspan") else "".join(el.itertext())
                    for el in svg.iter(ns + "text")]
    document = ET.parse(case / "diagram.drawio").getroot()
    model = document.find("diagram/mxGraphModel")
    assert model is not None, "Missing native model"
    assert close(model.get("pageWidth"), svg.get("width")), "Page width changed"
    assert close(model.get("pageHeight"), svg.get("height")), "Page height changed"
    cells = model.findall("root/mxCell")
    mapping = {cell.get("id"): cell for cell in cells}
    assert len(mapping) == len(cells), "Duplicate cell ID"
    assert mapping["1"].get("parent") == "0", "Missing root layer"
    roles = Counter(cell.get("musedrawRole") for cell in cells)
    assert roles["node"] == len(metadata["nodes"]), "Native node count changed"
    assert roles["group"] == len(metadata["groups"]), "Native group count changed"
    assert roles["relation"] == len(metadata["paths"]), "Attached relationship count changed"
    target_texts = [cell.get("value", "") for cell in cells if cell.get("musedrawRole") == "text"]
    assert Counter(source_texts) == Counter(target_texts), "Actual text content changed"
    stencil_count = 0
    for cell in cells:
        identifier = cell.get("id")
        if identifier == "0":
            continue
        assert cell.get("parent") in mapping, "Missing parent " + identifier
        ancestors, pointer = set(), cell
        while pointer.get("parent") is not None:
            pointer = mapping[pointer.get("parent")]
            assert pointer.get("id") not in ancestors, "Parent cycle"
            ancestors.add(pointer.get("id"))
        style = cell.get("style", "")
        assert "image=" not in style and "shape=image" not in style, "Image masquerading as editable diagram"
        assert "data:image" not in style and "<svg" not in style, "Embedded image data"
        assert not re.search(r"[A-Za-z]:[/\\]|file://|api[-_]?key|sk-", style, re.I), "Private path or key"
        stencil = re.search(r"shape=stencil\(([^)]*)\)", style)
        if stencil:
            shape = ET.fromstring(urllib.parse.unquote(zlib.decompress(base64.b64decode(stencil[1]), -15).decode()))
            assert shape.tag == "shape" and shape.find("background/path") is not None, "Non-native stencil"
            assert shape.find(".//image") is None and shape.find(".//include") is None, "External stencil asset"
            assert {el.tag for el in shape.iter()} <= {"shape", "background", "foreground", "path", "move", "line", "curve", "quad", "close", "fillstroke"}
            stencil_count += 1
    def origin(identifier):
        cell = mapping[identifier]
        geometry = cell.find("mxGeometry")
        x, y = float(geometry.get("x", 0)), float(geometry.get("y", 0))
        parent = cell.get("parent")
        while parent not in {"0", "1", None}:
            parent_cell = mapping[parent]
            pg = parent_cell.find("mxGeometry")
            x += float(pg.get("x", 0))
            y += float(pg.get("y", 0))
            parent = parent_cell.get("parent")
        return x, y
    for semantic in metadata["nodes"] + metadata["groups"]:
        cell = mapping["s-" + semantic["id"]]
        g = cell.find("mxGeometry")
        actual = [*origin(cell.get("id")), g.get("width"), g.get("height")]
        assert all(close(a, b) for a, b in zip(actual, semantic["box"])), "Semantic geometry changed " + semantic["id"]
        declared_ids = {s["id"] for s in metadata["nodes"] + metadata["groups"]}
        if semantic.get("parent") in declared_ids:
            assert cell.get("parent") == "s-" + semantic["parent"], "Declared node parent changed"
    for index, edge in enumerate(metadata["paths"]):
        cell = mapping["e-" + str(index + 1)]
        assert cell.get("source") == "s-" + edge["from"] and cell.get("target") == "s-" + edge["to"], "Wrong relationship endpoint"
        assert cell.get("edge") == "1", "Relationship is not a native edge"
        geometry = cell.find("mxGeometry")
        parent = cell.get("parent")
        ox, oy = origin(parent) if parent not in {"0", "1", None} else (0, 0)
        points = [geometry.find("mxPoint[@as='sourcePoint']"), *geometry.findall("Array/mxPoint"), geometry.find("mxPoint[@as='targetPoint']")]
        assert len(points) == len(edge["points"]), "Route point count changed"
        assert all(close(float(p.get("x")) + ox, q[0]) and close(float(p.get("y")) + oy, q[1])
                   for p, q in zip(points, edge["points"])), "Actual relationship route changed"
    return {"case": metadata["number"], "cells": len(cells) - 2, "nodes": roles["node"], "groups": roles["group"],
            "editableTexts": len(target_texts), "attachedEdges": roles["relation"], "nativeStencils": stencil_count,
            "embeddedImages": 0, "xmlStructurePassed": True,
            "svgSha256": hashlib.sha256((case / "diagram.svg").read_bytes()).hexdigest(),
            "drawioSha256": hashlib.sha256((case / "diagram.drawio").read_bytes()).hexdigest()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path, nargs="?", default=Path(__file__).resolve().parent)
    parser.add_argument("--report", type=Path, help="Write evidence outside the published collection")
    args = parser.parse_args()
    results, failures = [], []
    for number in range(1, 101):
        try:
            results.append(check(args.root / "cases" / f"{number:03}"))
        except Exception as exc:
            failures.append({"case": number, "error": str(exc)})
    report = {"cases": len(results), "failures": failures, "embeddedImages": 0,
              "validationScope": "XML structure, original text/semantic boxes/parents/real endpoint relations/routes, decoded native vector stencils; real-browser edits reported separately",
              "results": results}
    report_path = args.report or args.root / "drawio-structure-check.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, ensure_ascii=False))
    raise SystemExit(1 if failures else 0)

if __name__ == "__main__":
    main()
