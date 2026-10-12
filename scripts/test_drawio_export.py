#!/usr/bin/env python3
"""Dependency-free tests for native editable export, including rejection paths."""
import importlib.util
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("exporter", ROOT / "export_drawio.py")
EXPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORTER)


def sample(extra=""):
    metadata = {"number": 1, "groups": [{"id": "g", "title": "分组", "box": [20, 20, 400, 220], "headH": 40}],
                "nodes": [{"id": "a", "label": "模块甲", "box": [40, 80, 140, 100], "parent": "g"},
                          {"id": "b", "label": "模块乙", "box": [240, 80, 140, 100], "parent": "g"}],
                "bounds": [{"id": "t-1", "box": [40, 80, 140, 100]}, {"id": "t-2", "box": [240, 80, 140, 100]}],
                "paths": [{"from": "a", "to": "b", "points": [[180,130],[210,130],[240,130]], "label": "", "labelBox": None}]}
    svg = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg", "width": "500", "height": "300"})
    ET.SubElement(svg, "metadata", {"id": "layout-metadata"}).text = json.dumps(metadata, ensure_ascii=False)
    ET.SubElement(svg, "rect", {"width": "500", "height": "300", "fill": "#fff"})
    group = ET.SubElement(svg, "g", {"font-family": "Microsoft YaHei"})
    ET.SubElement(group, "rect", {"x": "20", "y": "20", "width": "400", "height": "220", "fill": "#eee"})
    for node, text_id in zip(metadata["nodes"], ("t-1", "t-2")):
        box = node["box"]
        ET.SubElement(group, "rect", dict(zip(("x", "y", "width", "height"), map(str, box)), fill="#ffffff", stroke="#37485e"))
        ET.SubElement(group, "text", {"id": text_id, "x": str(box[0] + box[2]/2), "y": "140", "font-size": "24", "fill": "#223344"}).text = node["label"]
    ET.SubElement(group, "path", {"d": "M180,130 L210,130 L240,130", "fill": "none", "stroke": "#3169a0", "marker-end": "url(#arrow)"})
    return ET.tostring(svg, encoding="unicode").replace("</svg>", extra + "</svg>")


class NativeDrawioTests(unittest.TestCase):
    def test_native_text_and_relations(self):
        xml, report = EXPORTER.Exporter(sample()).finish()
        cells = {c.get("id"): c for c in ET.fromstring(xml).iter("mxCell")}
        self.assertEqual(report["nativeNodes"], 2)
        self.assertEqual(report["embeddedImages"], 0)
        self.assertEqual(cells["t-1"].get("value"), "模块甲")
        self.assertEqual(cells["t-1"].get("parent"), "s-a")
        self.assertEqual(cells["s-a"].get("parent"), "s-g")
        self.assertEqual(cells["e-1"].get("source"), "s-a")
        self.assertEqual(cells["e-1"].get("target"), "s-b")
        self.assertEqual(cells["e-1"].get("parent"), "s-g")
        self.assertNotIn("image=", xml)

    def test_styles_come_from_actual_svg(self):
        xml, _ = EXPORTER.Exporter(sample().replace("#37485e", "#a93f26")).finish()
        cell = ET.fromstring(xml).find(".//mxCell[@id='s-a']")
        self.assertIn("strokeColor=#a93f26;", cell.get("style"))

    def test_image_is_not_an_editability_fallback(self):
        with self.assertRaisesRegex(ValueError, "Unsupported SVG primitive"):
            EXPORTER.Exporter(sample('<image href="data:image/png;base64,AA"/>')).finish()

    def test_script_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported SVG primitive"):
            EXPORTER.Exporter(sample('<script>ignored()</script>')).finish()

    def test_dtd_entity_rejected(self):
        with self.assertRaisesRegex(ValueError, "DTD"):
            EXPORTER.Exporter('<!DOCTYPE svg [<!ENTITY x "x">]>' + sample())

    def test_unhandled_path_command_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported SVG path command"):
            EXPORTER.Exporter(sample('<path d="M1,2 A5,5 0 0 0 10,10"/>')).finish()

    def test_unhandled_transform_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported SVG transform"):
            EXPORTER.Exporter(sample('<g transform="rotate(30)"><rect width="2" height="2"/></g>')).finish()

    def test_semantic_parent_cycle_rejected(self):
        source = sample().replace('"parent": "g"', '"parent": "b"', 1)
        source = source.replace('"parent": "g"', '"parent": "a"', 1)
        with self.assertRaisesRegex(ValueError, "Cyclic"):
            EXPORTER.Exporter(source)

    def test_relative_curves_are_native_stencils(self):
        xml, report = EXPORTER.Exporter(sample('<path d="M2,2v5c0,8 36,8 36,0V7" fill="none" stroke="#3169a0"/>')).finish()
        self.assertIn("shape=stencil(", xml)
        self.assertEqual(report["embeddedImages"], 0)


if __name__ == "__main__":
    unittest.main()
