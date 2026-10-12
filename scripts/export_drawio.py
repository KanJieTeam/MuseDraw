#!/usr/bin/env python3
"""Convert MuseDraw's declared SVG primitives into editable mxGraph cells.

This is deliberately not a general SVG importer. It accepts the native MuseDraw
rect/text/ellipse/circle/path/g vocabulary, rejects unsupported commands, and
reads styles from the actual SVG instead of applying an export-time theme.
Neither an SVG image nor a raster image is embedded in the exported diagram.
"""

from __future__ import annotations

import argparse
import base64
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

SVG_NS = "{http://www.w3.org/2000/svg}"
NUMBER = r"[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?"
TOKENS = re.compile(r"[A-Za-z]|" + NUMBER)
EPS = 0.001


def num(value):
    value = float(value)
    if not math.isfinite(value):
        raise ValueError("Non-finite coordinate")
    return str(round(value, 6)).rstrip("0").rstrip(".") if value else "0"


def box_equal(a, b):
    return all(abs(x - y) < EPS for x, y in zip(a, b))


def contains(a, b):
    return (a[0] <= b[0] + EPS and a[1] <= b[1] + EPS
            and a[0] + a[2] >= b[0] + b[2] - EPS
            and a[1] + a[3] >= b[1] + b[3] - EPS)


def tag(element):
    return element.tag.removeprefix(SVG_NS)


def transform_matrix(transform, parent):
    # Source primitives use only positive scale and translation. Reject other
    # transforms rather than making an export whose relationships only look right.
    tx, ty, sx, sy = parent
    for name, values in re.findall(r"([A-Za-z]+)\(([^)]*)\)", transform or ""):
        values = [float(v) for v in re.findall(NUMBER, values)]
        if name == "translate" and 1 <= len(values) <= 2:
            tx += values[0] * sx
            ty += (values[1] if len(values) == 2 else 0) * sy
        elif name == "scale" and 1 <= len(values) <= 2:
            sx *= values[0]
            sy *= values[1] if len(values) == 2 else values[0]
        else:
            raise ValueError("Unsupported SVG transform: " + name)
    if sx <= 0 or sy <= 0:
        raise ValueError("Only positive SVG scaling is supported")
    return tx, ty, sx, sy


def path_commands(data, matrix):
    """Parse source path commands into absolute native stencil operations."""
    tokens = TOKENS.findall(data)
    if re.sub(r"[\s,]", "", TOKENS.sub("", data)):
        raise ValueError("Unsupported SVG path tokens")
    i, command, previous = 0, None, None
    x = y = start_x = start_y = 0.0
    ops, coords = [], []
    tx, ty, sx, sy = matrix

    def transformed(px, py):
        point = [tx + px * sx, ty + py * sy]
        coords.append(point)
        return point

    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        if command is None:
            raise ValueError("Path starts without a command")
        upper, relative = command.upper(), command.islower()
        if upper == "Z":
            ops.append(("close", []))
            x, y = start_x, start_y
            command, previous = None, "Z"
            continue
        counts = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "Q": 4}
        if upper not in counts:
            raise ValueError("Unsupported SVG path command: " + command)
        count = counts[upper]
        values = tokens[i:i + count]
        if len(values) != count or any(v.isalpha() for v in values):
            raise ValueError("Incomplete SVG path command " + command)
        values = [float(v) for v in values]
        i += count
        ox, oy = (x, y) if relative else (0, 0)
        if upper in {"M", "L"}:
            x, y = values[0] + ox, values[1] + oy
            ops.append(("move" if upper == "M" else "line", transformed(x, y)))
            if upper == "M":
                start_x, start_y = x, y
                command = "l" if relative else "L"
        elif upper == "H":
            x = values[0] + (x if relative else 0)
            ops.append(("line", transformed(x, y)))
        elif upper == "V":
            y = values[0] + (y if relative else 0)
            ops.append(("line", transformed(x, y)))
        else:
            points = [transformed(values[j] + ox, values[j + 1] + oy)
                      for j in range(0, count, 2)]
            x, y = values[-2] + ox, values[-1] + oy
            ops.append(("curve" if upper == "C" else "quad", sum(points, [])))
        previous = upper
    if not coords:
        raise ValueError("Empty SVG path")
    return ops, coords


def stencil_shape(ops, box):
    """Native mxStencil geometry, not SVG/PNG image data."""
    x, y, w, h = box
    shape = ET.Element("shape", {"w": "100", "h": "100", "aspect": "variable",
                                  "strokewidth": "inherit"})
    background = ET.SubElement(shape, "background")
    path = ET.SubElement(background, "path")
    for name, values in ops:
        if name == "close":
            ET.SubElement(path, "close")
            continue
        attrs = {}
        for j in range(0, len(values), 2):
            suffix = str(j // 2 + 1) if name in {"curve", "quad"} else ""
            attrs["x" + suffix] = num((values[j] - x) / w * 100)
            attrs["y" + suffix] = num((values[j + 1] - y) / h * 100)
        ET.SubElement(path, name, attrs)
    foreground = ET.SubElement(shape, "foreground")
    ET.SubElement(foreground, "fillstroke")
    # draw.io Graph.compress: URI encoding, raw DEFLATE, Base64.
    xml = ET.tostring(shape, encoding="unicode")
    compressor = zlib.compressobj(level=9, wbits=-15)
    data = compressor.compress(urllib.parse.quote(xml, safe="~()*!.'-").encode("ascii"))
    data += compressor.flush()
    return "stencil(" + base64.b64encode(data).decode("ascii") + ")"


def style_string(styles):
    for key, value in styles.items():
        if ";" in str(key) or ";" in str(value):
            raise ValueError("Unsafe style token")
    return ";".join(f"{key}={value}" for key, value in styles.items()) + ";"


class Exporter:
    def __init__(self, source):
        if len(source.encode("utf-8")) > 4 * 1024 * 1024:
            raise ValueError("MuseDraw SVG exceeds the 4 MiB input limit")
        if re.search(r"<!DOCTYPE|<!ENTITY", source, re.I):
            raise ValueError("DTD and XML entity declarations are not supported")
        self.svg = ET.fromstring(source)
        metadata = self.svg.find(SVG_NS + "metadata[@id='layout-metadata']")
        if metadata is None:
            raise ValueError("Missing declared MuseDraw geometry")
        self.metadata = json.loads(metadata.text)
        self.width, self.height = float(self.svg.attrib["width"]), float(self.svg.attrib["height"])
        self.semantics = {s["id"]: {**s, "kind": kind}
                          for kind, values in (("group", self.metadata["groups"]),
                                               ("node", self.metadata["nodes"]))
                          for s in values}
        if len(self.semantics) != len(self.metadata["groups"]) + len(self.metadata["nodes"]):
            raise ValueError("Duplicate source semantic ID")
        if len(self.semantics) > 10000:
            raise ValueError("Too many semantic shapes")
        for semantic in self.semantics.values():
            box = semantic["box"]
            if len(box) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in box):
                raise ValueError("Invalid semantic box")
            if box[2] <= 0 or box[3] <= 0:
                raise ValueError("Semantic shapes must have positive dimensions")
        self.bounds = {b["id"]: b["box"] for b in self.metadata["bounds"]}
        self.parents = {}
        for identifier, semantic in self.semantics.items():
            explicit = semantic.get("parent")
            candidates = [g for g in self.metadata["groups"] if g["id"] != identifier
                          and g["box"][2] * g["box"][3] > semantic["box"][2] * semantic["box"][3] + EPS
                          and contains(g["box"], semantic["box"])]
            # mxGraph supports a declared child whose decoration extends beyond
            # its container. Preserve declared ownership even in that case.
            if explicit in self.semantics:
                parent = explicit
            else:
                parent = min(candidates, key=lambda g: g["box"][2] * g["box"][3])["id"] if candidates else None
            self.parents[identifier] = parent
        for identifier in self.parents:
            seen, pointer = set(), identifier
            while pointer is not None:
                if pointer in seen:
                    raise ValueError("Cyclic semantic parent ownership")
                seen.add(pointer)
                pointer = self.parents[pointer]
        self.mxfile = ET.Element("mxfile", {"host": "MuseDraw", "compressed": "false", "version": "1"})
        title = self.svg.find(SVG_NS + "title")
        diagram = ET.SubElement(self.mxfile, "diagram", {"id": "musedraw-" + str(self.metadata["number"]),
                                                        "name": title.text if title is not None else "MuseDraw"})
        background = self.svg.find(SVG_NS + "rect")
        model = ET.SubElement(diagram, "mxGraphModel", {"dx": "0", "dy": "0", "grid": "0", "gridSize": "10",
            "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1",
            "page": "1", "pageScale": "1", "pageWidth": num(self.width), "pageHeight": num(self.height),
            "math": "0", "shadow": "0", "background": background.get("fill", "#ffffff") if background is not None else "#ffffff"})
        self.root = ET.SubElement(model, "root")
        ET.SubElement(self.root, "mxCell", {"id": "0"})
        ET.SubElement(self.root, "mxCell", {"id": "1", "parent": "0"})
        self.serial, self.created_semantics, self.texts, self.edges = 0, set(), [], []
        self.semantic_paths = set()
        self.converted_primitives = Counter()

    def identifier(self, prefix):
        self.serial += 1
        return f"{prefix}-{self.serial}"

    def owner(self, box, exclude=None):
        candidates = [s for identifier, s in self.semantics.items()
                      if identifier != exclude and contains(s["box"], box)]
        return min(candidates, key=lambda s: s["box"][2] * s["box"][3])["id"] if candidates else None

    def parent_origin(self, parent):
        return self.semantics[parent]["box"][:2] if parent else [0, 0]

    def vertex(self, identifier, box, styles, value="", parent=None, role="primitive", connectable=False):
        x, y, w, h = box
        ox, oy = self.parent_origin(parent)
        cell = ET.SubElement(self.root, "mxCell", {"id": identifier, "value": value,
            "style": style_string(styles), "vertex": "1", "parent": "s-" + parent if parent else "1",
            "connectable": "1" if connectable else "0", "musedrawRole": role})
        ET.SubElement(cell, "mxGeometry", {"x": num(x - ox), "y": num(y - oy),
            "width": num(w), "height": num(h), "as": "geometry"})
        return cell

    def graphical_style(self, attrs, shape="rectangle"):
        return {"shape": shape, "fillColor": attrs.get("fill", "none"),
                "strokeColor": attrs.get("stroke", "none"),
                "strokeWidth": attrs.get("stroke-width", "1"),
                "dashed": "1" if attrs.get("stroke-dasharray") else "0",
                "dashPattern": "7 5", "rounded": "0", "shadow": "0", "glass": "0",
                "html": "0", "whiteSpace": "wrap"}

    def text(self, element, attrs, matrix):
        tx, ty, sx, sy = matrix
        identifier = element.get("id")
        spans = element.findall(SVG_NS + "tspan")
        value = "\n".join("".join(s.itertext()) for s in spans) if spans else "".join(element.itertext())
        if not value:
            return
        font_size = float(attrs.get("font-size", 24)) * sy
        align = "left" if attrs.get("text-anchor", "start") == "start" else "center"
        if identifier in self.bounds:
            box = self.bounds[identifier]
        else:
            width = max(font_size, sum(1 if ord(c) > 255 else .61 for c in value) * font_size)
            x = tx + float(element.get("x", 0)) * sx
            y = ty + float(element.get("y", 0)) * sy
            box = [x if align == "left" else x - width / 2, y - font_size * .91, width, font_size * 1.3]
        parent = self.owner(box)
        font = attrs.get("font-family", "Microsoft YaHei").split(",")[0].strip().strip("'\"")
        styles = {"shape": "text", "html": "0", "whiteSpace": "wrap", "fillColor": "none",
                  "strokeColor": "none", "fontFamily": font, "fontSize": num(font_size),
                  "fontColor": attrs.get("fill", "#242b35"),
                  "fontStyle": "1" if float(attrs.get("font-weight", 400)) >= 600 else "0",
                  "align": align, "verticalAlign": "middle", "spacing": "0", "spacingLeft": "12" if align == "left" and identifier in self.bounds else "0",
                  "overflow": "visible", "autosize": "0", "editable": "1", "resizable": "1", "movable": "1"}
        cell = self.vertex(identifier or self.identifier("text"), box, styles, value, parent, "text")
        self.texts.append({"id": cell.get("id"), "value": value, "parent": parent})

    def path(self, element, attrs, matrix):
        ops, coords = path_commands(element.attrib["d"], matrix)
        pure_line = all(name in {"move", "line"} for name, _ in ops) and sum(name == "move" for name, _ in ops) == 1
        matched_index = None
        if pure_line and attrs.get("marker-end"):
            for i, edge in enumerate(self.metadata["paths"]):
                if i not in self.semantic_paths and len(coords) == len(edge["points"]) and all(
                        box_equal(a, b) for a, b in zip(coords, edge["points"])):
                    matched_index = i
                    break
        if matched_index is not None:
            edge = self.metadata["paths"][matched_index]
            self.semantic_paths.add(matched_index)
            self.edge(edge, attrs, matched_index)
        elif pure_line:
            self.edge({"points": coords}, attrs, None)
        else:
            xs, ys = zip(*coords)
            box = [min(xs), min(ys), max(max(xs) - min(xs), .1), max(max(ys) - min(ys), .1)]
            self.vertex(self.identifier("vector"), box,
                        self.graphical_style(attrs, stencil_shape(ops, box)),
                        parent=self.owner(box), role="vector")

    def edge(self, edge, attrs, index):
        points = edge["points"]
        styles = self.graphical_style(attrs, "connector")
        styles.update({"fillColor": "none", "endArrow": "block" if attrs.get("marker-end") else "none",
                       "endFill": "1", "endSize": "7", "startArrow": "none", "rounded": "0",
                       "edgeStyle": "none", "noEdgeStyle": "1", "orthogonalLoop": "1", "jettySize": "auto"})
        if index is not None:
            def ancestors(identifier):
                result = []
                while identifier:
                    identifier = self.parents[identifier]
                    if identifier:
                        result.append(identifier)
                return result
            source_ancestors, target_ancestors = ancestors(edge["from"]), ancestors(edge["to"])
            parent = next((p for p in source_ancestors if p in target_ancestors), None)
        else:
            xs, ys = zip(*points)
            parent = self.owner([min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)])
        ox, oy = self.parent_origin(parent)
        attributes = {"id": "e-" + str(index + 1) if index is not None else self.identifier("line"),
                      "value": "", "edge": "1", "parent": "s-" + parent if parent else "1",
                      "musedrawRole": "relation" if index is not None else "line"}
        if index is not None:
            for side, point, prefix in (("from", points[0], "exit"), ("to", points[-1], "entry")):
                node = self.semantics[edge[side]]
                x, y, w, h = node["box"]
                styles.update({prefix + "X": num((point[0] - x) / w), prefix + "Y": num((point[1] - y) / h),
                               prefix + "Dx": "0", prefix + "Dy": "0", prefix + "Perimeter": "0"})
            attributes.update(source="s-" + edge["from"], target="s-" + edge["to"])
            self.edges.append({"id": attributes["id"], "source": edge["from"], "target": edge["to"]})
        attributes["style"] = style_string(styles)
        cell = ET.SubElement(self.root, "mxCell", attributes)
        geometry = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        for point, name in ((points[0], "sourcePoint"), (points[-1], "targetPoint")):
            ET.SubElement(geometry, "mxPoint", {"x": num(point[0] - ox), "y": num(point[1] - oy), "as": name})
        intermediate = ET.SubElement(geometry, "Array", {"as": "points"})
        for x, y in points[1:-1]:
            ET.SubElement(intermediate, "mxPoint", {"x": num(x - ox), "y": num(y - oy)})

    def visit(self, element, inherited=None, matrix=(0, 0, 1, 1)):
        kind = tag(element)
        if kind in {"title", "desc", "metadata", "defs"}:
            return
        attrs = {**(inherited or {}), **element.attrib}
        matrix = transform_matrix(element.get("transform"), matrix)
        tx, ty, sx, sy = matrix
        if kind in {"svg", "g"}:
            for child in element:
                self.visit(child, attrs, matrix)
            return
        self.converted_primitives[kind] += 1
        if kind == "text":
            self.text(element, attrs, matrix)
        elif kind == "path":
            self.path(element, attrs, matrix)
        elif kind in {"rect", "circle", "ellipse"}:
            if kind == "rect":
                box = [tx + float(element.get("x", 0)) * sx, ty + float(element.get("y", 0)) * sy,
                       float(element.attrib["width"]) * sx, float(element.attrib["height"]) * sy]
            else:
                rx = ry = float(element.attrib["r"]) if kind == "circle" else 0
                if kind == "ellipse":
                    rx, ry = float(element.attrib["rx"]), float(element.attrib["ry"])
                box = [tx + (float(element.attrib["cx"]) - rx) * sx, ty + (float(element.attrib["cy"]) - ry) * sy,
                       2 * rx * sx, 2 * ry * sy]
            # The page background belongs to the page, not an uneditable covering cell.
            if kind == "rect" and box_equal(box, [0, 0, self.width, self.height]):
                return
            matches = [s for s in self.semantics.values() if s["id"] not in self.created_semantics and box_equal(s["box"], box)]
            semantic = matches[0] if matches else None
            identifier = "s-" + semantic["id"] if semantic else self.identifier(kind)
            styles = self.graphical_style(attrs, "rectangle" if kind == "rect" else "ellipse")
            radius = float(element.get("rx", 0)) * sx if kind == "rect" else 0
            if radius:
                styles.update(rounded="1", absoluteArcSize="1", arcSize=num(radius * 2))
            parent = self.parents[semantic["id"]] if semantic else self.owner(box)
            if semantic:
                self.created_semantics.add(semantic["id"])
                styles.update(container="1", collapsible="0", recursiveResize="0")
            self.vertex(identifier, box, styles, parent=parent,
                        role=semantic["kind"] if semantic else "primitive", connectable=semantic is not None)
        else:
            raise ValueError("Unsupported SVG primitive: " + kind)

    def finish(self):
        self.visit(self.svg)
        missing = set(self.semantics) - self.created_semantics
        if missing:
            raise ValueError("Missing native semantic shapes: " + ", ".join(sorted(missing)))
        missing_edges = set(range(len(self.metadata["paths"]))) - self.semantic_paths
        if missing_edges:
            raise ValueError("Missing native attached edges: " + str(sorted(missing_edges)))
        text_values = [t["value"].replace("\n", "") for t in self.texts]
        for node in self.metadata["nodes"]:
            if node["label"].replace("\n", "") not in text_values:
                raise ValueError("Missing node text: " + node["label"])
        ET.indent(self.mxfile, space="  ")
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(self.mxfile, encoding="unicode") + "\n"
        report = {"case": self.metadata["number"], "nativeNodes": len(self.metadata["nodes"]),
                  "nativeGroups": len(self.metadata["groups"]), "nativeTextCells": len(self.texts),
                  "nativeAttachedEdges": len(self.edges), "convertedPrimitives": dict(self.converted_primitives),
                  "embeddedImages": 0, "nativeStencilGeometry": True, "textCells": self.texts,
                  "semanticParents": self.parents, "edges": self.edges,
                  "validation": "native XML structure only; editor browser checks are reported separately"}
        return xml, report


def export_file(svg_path, output_path):
    source = Path(svg_path).read_text(encoding="utf-8")
    exporter = Exporter(source)
    xml, report = exporter.finish()
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(xml, encoding="utf-8")
    report["svgSha256"] = hashlib.sha256(source.encode("utf-8")).hexdigest()
    report["drawioSha256"] = hashlib.sha256(xml.encode("utf-8")).hexdigest()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Single MuseDraw SVG, or gallery root containing cases/001/diagram.svg")
    parser.add_argument("output", type=Path, nargs="?", help="Destination .drawio for single-file mode")
    parser.add_argument("--cases", help="Comma-separated case numbers for gallery mode; default: all 100")
    args = parser.parse_args()
    if args.source.is_file():
        report = export_file(args.source, args.output or args.source.with_suffix(".drawio"))
        print(json.dumps({k: v for k, v in report.items() if k not in {"textCells", "semanticParents", "edges"}}, ensure_ascii=False))
        return
    numbers = [int(v) for v in args.cases.split(",")] if args.cases else list(range(1, 101))
    if any(n < 1 or n > 100 for n in numbers) or len(set(numbers)) != len(numbers):
        parser.error("Cases must be distinct integers from 1 to 100")
    reports = []
    for number in numbers:
        case = args.source / "cases" / f"{number:03}"
        reports.append(export_file(case / "diagram.svg", case / "diagram.drawio"))
    summary = {"total": len(reports), "failures": 0, "nativeNodes": sum(r["nativeNodes"] for r in reports),
               "nativeGroups": sum(r["nativeGroups"] for r in reports),
               "nativeTextCells": sum(r["nativeTextCells"] for r in reports),
               "nativeAttachedEdges": sum(r["nativeAttachedEdges"] for r in reports), "embeddedImages": 0,
               "editorBrowserVerified": False, "cases": reports}
    (args.source / "drawio-export-report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "cases"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
