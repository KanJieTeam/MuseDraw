"""Resolve optional role-based design tokens; no templates, network or renderer."""
import argparse
import copy
import json
import math
from pathlib import Path
import re
import sys
import unicodedata

RESOURCE = Path(__file__).resolve().parents[1] / "references" / "style-tokens.json"
ROLES = {"canvas", "ink", "muted", "surface", "border", "accent", "secondary", "focus", "inverse"}
LAYOUT_FIELDS = {"headroom", "itemGap", "sectionGap", "padding", "minimumBody", "maxColumns", "radius"}
DENSITIES = {
    "normal": {"headroom": 60, "itemGap": 12, "sectionGap": 24, "padding": 24, "maxColumns": 5},
    "compact": {"headroom": 56, "itemGap": 8, "sectionGap": 16, "padding": 20, "maxColumns": 6},
    "comfortable": {"headroom": 64, "itemGap": 16, "sectionGap": 32, "padding": 32, "maxColumns": 4},
}
DENSITY_ALIASES = {"常规": "normal", "正常": "normal", "紧凑": "compact", "密集": "compact",
                   "宽松": "comfortable", "留白": "comfortable"}


def normalized(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("A non-empty style, variant or view name is required")
    value = unicodedata.normalize("NFKC", value).strip().casefold()
    value = re.sub(r"[\s_]+", "-", value)
    return value.removesuffix("风格")


def aliases(entries, extra):
    result = {}
    for identifier, entry in entries.items():
        for name in [identifier, entry["label"], *extra.get(identifier, [])]:
            key = normalized(name)
            if key in result and result[key] != identifier:
                raise ValueError("Ambiguous style or variant alias")
            result[key] = identifier
    return result


def load_tokens(source=RESOURCE):
    data = json.loads(Path(source).read_text(encoding="utf-8"))
    if data.get("version") != 1 or data.get("grid") != 8:
        raise ValueError("Unsupported style token version/grid")
    for family in data["styles"].values():
        if set(family) != ROLES | {"label"} or not all(re.fullmatch(r"#[0-9A-F]{6}", family[role]) for role in ROLES):
            raise ValueError("Incomplete or invalid role palette")
    if not all(type(size) is int and size > 0 for size in data["typography"].values()):
        raise ValueError("Invalid typography scale")
    if set(data["aliases"]) != set(data["styles"]) or set(data["detailColors"]) != set(data["styles"]):
        raise ValueError("Every family needs aliases and detail colors")
    aliases(data["styles"], data["aliases"])
    for details in data["detailColors"].values():
        if set(details) != {"relationship"} or any(not re.fullmatch(r"#[0-9A-F]{6}", color) for color in details.values()):
            raise ValueError("Invalid detail color roles")
    variants = data["variants"]
    aliases(variants, {key: value["aliases"] for key, value in variants.items()})
    for variant in variants.values():
        if variant["headerTreatment"] not in {"outline", "band", "strip"} or variant["defaultDensity"] not in DENSITIES:
            raise ValueError("Unsupported sub-style treatment or density")
        rules = variant["layoutRules"]
        if set(rules) != LAYOUT_FIELDS or any(type(value) is not int or value < 0 for value in rules.values()):
            raise ValueError("Invalid sub-style layout rules")
        if rules["minimumBody"] < 18 or rules["headroom"] < rules["minimumBody"] + 16:
            raise ValueError("Sub-style must retain readable text and heading space")
        if any(type(value) is not int or not 100 <= value <= 900 for value in variant["weights"].values()):
            raise ValueError("Invalid sub-style font weights")
    if set(data["viewDefaults"]) != {"capability", "component", "integration", "deployment"} or any(
            variant not in variants for variant in data["viewDefaults"].values()):
        raise ValueError("Unsupported architecture view defaults")
    return data


def resolve_style(identifier, variant=None, view="capability", density=None):
    """Resolve a visual family without importing a case's content or geometry.

    A user can say only '墨蓝风格'. View and density choose a sub-style unless
    explicitly specified. These rules describe visual components, not topology.
    """
    tokens = load_tokens()
    family_id = aliases(tokens["styles"], tokens["aliases"]).get(normalized(identifier))
    if family_id is None:
        raise ValueError("Unknown visual style; choose a listed style or design an explicit custom system")
    view = normalized(view)
    if view not in tokens["viewDefaults"]:
        raise ValueError("Unknown architecture view")
    if density is not None:
        density = normalized(density)
        density = DENSITY_ALIASES.get(density, density)
        if density not in DENSITIES:
            raise ValueError("Unknown visual density")
    if variant is None:
        variant_id = "compact" if density == "compact" else tokens["viewDefaults"][view]
    else:
        variant_id = aliases(tokens["variants"], {key: value["aliases"] for key, value in tokens["variants"].items()}).get(normalized(variant))
        if variant_id is None:
            raise ValueError("Unknown sub-style")
    profile = tokens["variants"][variant_id]
    result = {key: copy.deepcopy(tokens[key]) for key in ("version", "fonts", "grid", "typography", "stroke")}
    result["id"] = family_id
    result["colors"] = copy.deepcopy(tokens["styles"][family_id])
    result["detailColors"] = copy.deepcopy(tokens["detailColors"][family_id])
    result["family"] = {"id": family_id, "label": tokens["styles"][family_id]["label"]}
    result["variant"] = {key: profile[key] for key in ("label", "headerTreatment")}
    result["variant"]["id"] = variant_id
    result["view"] = view
    result["density"] = density or profile["defaultDensity"]
    result["weights"] = copy.deepcopy(profile["weights"])
    result["stroke"] = copy.deepcopy(profile["stroke"])
    result["layoutRules"] = copy.deepcopy(profile["layoutRules"])
    if density is not None:
        result["layoutRules"].update(DENSITIES[density])
    return result


def allocate_widths(total, weights, gap=8, grid=8):
    """Allocate finite space in whole grid units, retaining the final remainder.

    Weights describe actual text/column demand. This is not a graph-layout engine.
    The last cell receives any sub-grid remainder so the outer edge is exact.
    """
    if (type(total) not in (int, float) or not math.isfinite(total) or total <= 0
            or type(gap) not in (int, float) or not math.isfinite(gap) or gap < 0
            or type(grid) is not int or grid <= 0):
        raise ValueError("Positive finite total/grid and nonnegative finite gap required")
    if not weights or any(type(w) not in (int, float) or w <= 0 or not math.isfinite(w) for w in weights):
        raise ValueError("Positive finite width weights required")
    if not math.isfinite(sum(weights)):
        raise ValueError("Width weights exceed finite range")
    available = total - gap * (len(weights) - 1)
    units = int(available // grid)
    if units < len(weights):
        raise ValueError("Insufficient layout width")
    extra = units - len(weights)
    weight_total = sum(weights)
    shares = [extra * (w / weight_total) for w in weights]
    portions = [1 + int(share) for share in shares]
    for index in sorted(range(len(weights)), key=lambda i: (shares[i] - int(shares[i]), -i), reverse=True)[:units - sum(portions)]:
        portions[index] += 1
    widths = [portion * grid for portion in portions]
    widths[-1] += available - sum(widths)
    return widths


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("style", nargs="?")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--variant", help="Optional sub-style name; otherwise selected from view/density")
    parser.add_argument("--view", default="capability", choices=("capability", "component", "integration", "deployment"))
    parser.add_argument("--density", help="normal, compact or comfortable")
    args = parser.parse_args()
    if args.list:
        result = [{"id": key, "label": value["label"]} for key, value in load_tokens()["styles"].items()]
    elif args.style:
        result = resolve_style(args.style, args.variant, args.view, args.density)
    else:
        parser.error("Provide a style or --list")
    print(json.dumps(result, ensure_ascii=False, indent=2))
